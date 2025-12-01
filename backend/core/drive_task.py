import asyncio
import os
import json
import time
from typing import List, Dict, Optional
from .downloader import DownloadTask, TaskStatus, settings_manager
from .drive import drive_manager

class DriveFolderTask:
    def __init__(self, folder_id: str, name: str, download_dir: str, max_connections: int = 4, auto_extract: bool = False, speed_limit: int = 0):
        self.id = str(int(time.time() * 1000))
        self.folder_id = folder_id
        self.name = name # Folder name
        self.filename = name # For compatibility with UI which expects filename
        self.url = f"https://drive.google.com/drive/folders/{folder_id}" # Construct URL
        self.download_dir = download_dir
        
        # Determine base path based on organization settings
        if settings_manager.settings.organize_files:
            self.filepath = os.path.join(download_dir, "Gdrive Folders", name)
        else:
            self.filepath = os.path.join(download_dir, name) # Base path for the folder
            
        self.max_connections = max_connections
        
        self.status = TaskStatus.PENDING
        self.total_size = 0 # Sum of all file sizes (if known)
        self.downloaded_size = 0
        self.speed = 0
        self.speed_limit = speed_limit
        self.auto_extract = auto_extract
        self.extraction_skipped = False
        self.supports_resume = True
        self.error_message = None
        self.completed_at = 0
        
        self.sub_tasks: List[DownloadTask] = []
        self.files_metadata = [] # List of dicts: {id, name, mimeType, size, relative_path}
        self.scanned = False
        
        self.task_runner: Optional[asyncio.Task] = None
        self._cancel_event = asyncio.Event()
        self._pause_event = asyncio.Event()
        self._pause_event.set()
        
        # Hidden metadata directory
        self.meta_dir = os.path.join(download_dir, ".parts")
        if not os.path.exists(self.meta_dir):
            os.makedirs(self.meta_dir)
        self.state_file = os.path.join(self.meta_dir, f"{name}.state.json")

    async def start(self):
        self.status = TaskStatus.DOWNLOADING
        
        if not self.scanned:
            await self._scan_folder()
        
        # Create sub-tasks if not already created
        if not self.sub_tasks and self.files_metadata:
            self._create_sub_tasks()
            
        # Run sub-tasks (downloads inside the folder).
        # Since this folder is treated as a single task in DownloadManager,
        # we must manage all child downloads ourselves.
        #
        # We'll control concurrency with a semaphore so only a limited number
        # of files download at the same time. For now, we allow 2 concurrent
        # file downloads to keep things stable.

        semaphore = asyncio.Semaphore(2) 
        
        async def run_sub_task(task: DownloadTask):
            async with semaphore:
                if self.status != TaskStatus.DOWNLOADING:
                    return
                
                # We need to manually run the sub-task's start
                # But sub-task start() assumes it's being run by DownloadManager?
                # It mostly just needs to run.
                
                # Hook into sub-task updates to update our own progress
                # This is tricky. We can poll them or they can callback.
                # Polling in _monitor is easier.
                
                await task.start()

        self.active_runners = []
        for task in self.sub_tasks:
            if task.status == TaskStatus.COMPLETED:
                continue
                
            if self.status != TaskStatus.DOWNLOADING:
                break
                
            # Wait if paused
            if not self._pause_event.is_set():
                self.save_state()
                await self._pause_event.wait()
                
            if self.status == TaskStatus.CANCELED:
                break

            # Create runner
            runner = asyncio.create_task(run_sub_task(task))
            self.active_runners.append(runner)
        
        # Monitor progress
        monitor = asyncio.create_task(self._monitor_progress())
        
        try:
            await asyncio.gather(*self.active_runners)
        except Exception as e:
            self.error_message = str(e)
            self.status = TaskStatus.ERROR
        finally:
            monitor.cancel()
            
        # Check completion
        if all(t.status == TaskStatus.COMPLETED for t in self.sub_tasks):
            self.status = TaskStatus.COMPLETED
            self.completed_at = time.time()
            self._sync_progress() # Ensure sizes match for UI
            self.save_state()

    def _sync_progress(self):
        downloaded = 0
        current_total_size = 0
        
        for i, t in enumerate(self.sub_tasks):
            downloaded += t.downloaded_size
            
            # If task is completed, use its downloaded size as total size to ensure 100%
            if t.status == TaskStatus.COMPLETED:
                current_total_size += t.downloaded_size
            elif t.total_size > 0:
                current_total_size += t.total_size
            elif i < len(self.files_metadata):
                current_total_size += int(self.files_metadata[i].get('size', 0))
        
        self.downloaded_size = downloaded
        self.total_size = current_total_size
        self.speed = 0

    async def _scan_folder(self):
        # Recursive scan
        # This might take a while for large folders.
        # We should probably do this iteratively or allow it to be paused?
        # For now, simple recursive.
        
        self.files_metadata = []
        await self._recursive_scan(self.folder_id, self.name)
        self.scanned = True
        self.save_state()

    async def _recursive_scan(self, folder_id: str, current_path: str):
        page_token = None
        while True:
            if self.status == TaskStatus.CANCELED:
                return
                
            results = drive_manager.list_files(folder_id, page_token)
            files = results.get('files', [])
            page_token = results.get('nextPageToken')

            for file in files:
                name = file['name']
                fid = file['id']
                mime = file['mimeType']
                size = int(file.get('size', 0))
                
                # Sanitize name
                safe_name = "".join([c for c in name if c.isalpha() or c.isdigit() or c in " ._-()"]).strip()
                rel_path = os.path.join(current_path, safe_name)
                
                if mime == 'application/vnd.google-apps.folder':
                    await self._recursive_scan(fid, rel_path)
                else:
                    self.files_metadata.append({
                        'id': fid,
                        'name': safe_name,
                        'relative_path': rel_path,
                        'size': size,
                        'mimeType': mime
                    })
                    self.total_size += size
            
            if not page_token:
                break

    def _create_sub_tasks(self):
        headers = drive_manager.get_headers()
        for meta in self.files_metadata:
            # Check if task already exists (resume logic)
            # We need to map metadata to subtasks.
            # For now, just recreate them. DownloadTask has resume logic if file exists.
            
            url = f"https://www.googleapis.com/drive/v3/files/{meta['id']}?alt=media"
            # Filename should be the full relative path inside download_dir
            # But DownloadTask expects filename to be relative to download_dir?
            # Actually DownloadTask takes download_dir and filename.
            # If filename has slashes, it handles it.
            
            # We want the file to be at: download_dir / relative_path
            # relative_path includes the root folder name.
            # So if we pass download_dir as root, and filename as relative_path, it works.
            
            # Determine effective filename based on organization settings
            final_filename = meta['relative_path']
            if settings_manager.settings.organize_files:
                 final_filename = os.path.join("Gdrive Folders", final_filename)

            task = DownloadTask(
                url=url,
                filename=final_filename,
                download_dir=self.download_dir,
                num_connections=self.max_connections,
                headers=headers,
                auto_extract=self.auto_extract
            )
            
            if self.speed_limit > 0:
                task.set_speed_limit(self.speed_limit)
            
            # Restore state if possible
            # We need to know the ID of the subtask if we want to restore it perfectly.
            # But DownloadTask generates a new ID on init.
            # We should probably save subtask IDs in our state.
            
            self.sub_tasks.append(task)

    async def _monitor_progress(self):
        while self.status in [TaskStatus.DOWNLOADING, TaskStatus.PAUSED]:
            if self.status == TaskStatus.PAUSED:
                self.speed = 0
                await asyncio.sleep(1)
                continue

            downloaded = 0
            speed = 0
            current_total_size = 0
            
            for i, t in enumerate(self.sub_tasks):
                downloaded += t.downloaded_size
                speed += t.speed
                
                # Update total size based on actual task size if available
                # Fallback to metadata size if task hasn't started or size unknown
                if t.total_size > 0:
                    current_total_size += t.total_size
                elif i < len(self.files_metadata):
                    current_total_size += int(self.files_metadata[i].get('size', 0))
            
            self.downloaded_size = downloaded
            self.total_size = current_total_size
            self.speed = speed
            
            # Save state occasionally
            await asyncio.sleep(2)
            self.save_state()

    def save_state(self):
        # We need to save the state of sub-tasks too?
        # DownloadTask saves its own state.
        # We just need to save our metadata and list of sub-tasks (ids?)
        
        sub_task_states = []
        for t in self.sub_tasks:
            t.save_state() # Ensure they are saved
            sub_task_states.append({
                'id': t.id,
                'filename': t.filename,
                'status': t.status
            })

        state = {
            "type": "folder",
            "id": self.id,
            "folder_id": self.folder_id,
            "name": self.name,
            "status": self.status,
            "scanned": self.scanned,
            "files_metadata": self.files_metadata,
            "total_size": self.total_size,
            "downloaded_size": self.downloaded_size,
            "sub_tasks": sub_task_states,
            "auto_extract": self.auto_extract,
            "speed_limit": self.speed_limit,
            "max_connections": self.max_connections,
            "completed_at": self.completed_at
        }
        
        with open(self.state_file, 'w') as f:
            json.dump(state, f)

    def load_state(self):
        if not os.path.exists(self.state_file):
            return False
            
        try:
            with open(self.state_file, 'r') as f:
                state = json.load(f)
                
            self.id = state.get('id', self.id)
            self.folder_id = state.get('folder_id')
            self.name = state.get('name')
            self.status = state.get('status', TaskStatus.PENDING)
            self.scanned = state.get('scanned', False)
            self.files_metadata = state.get('files_metadata', [])
            self.total_size = state.get('total_size', 0)
            self.downloaded_size = state.get('downloaded_size', 0)
            self.auto_extract = state.get('auto_extract', False)
            self.speed_limit = state.get('speed_limit', 0)
            self.max_connections = state.get('max_connections', 4)
            self.completed_at = state.get('completed_at', 0)
            
            # Restore sub-tasks
            # We need to re-instantiate them.
            # We can use the metadata to recreate them, and then load their individual states.
            
            self.sub_tasks = []
            headers = drive_manager.get_headers()
            
            # Map of filename to subtask state for easier lookup
            saved_sub_tasks = {s['filename']: s for s in state.get('sub_tasks', [])}
            
            for meta in self.files_metadata:
                url = f"https://www.googleapis.com/drive/v3/files/{meta['id']}?alt=media"
                
                # Determine effective filename based on organization settings
                final_filename = meta['relative_path']
                if settings_manager.settings.organize_files:
                     final_filename = os.path.join("Gdrive Folders", final_filename)
                
                task = DownloadTask(
                    url=url,
                    filename=final_filename,
                    download_dir=self.download_dir,
                    num_connections=self.max_connections,
                    headers=headers,
                    auto_extract=self.auto_extract
                )
                
                if self.speed_limit > 0:
                    task.set_speed_limit(self.speed_limit)
                
                # Try to load state
                if task.load_state():
                    # If loaded, good.
                    pass
                else:
                    # If not found on disk, maybe we have some info in our saved state?
                    # Not really, DownloadTask state is authoritative.
                    pass
                
                self.sub_tasks.append(task)
                
            return True
        except Exception as e:
            print(f"Error loading folder task: {e}")
            return False

    def pause(self):
        self.status = TaskStatus.PAUSED
        self._pause_event.clear()
        for t in self.sub_tasks:
            if t.status == TaskStatus.DOWNLOADING:
                t.pause()

    def resume(self):
        if self.status == TaskStatus.COMPLETED:
            return
        self.status = TaskStatus.DOWNLOADING
        self._pause_event.set()
        
        # Resume all paused sub-tasks
        for t in self.sub_tasks:
            if t.status == TaskStatus.PAUSED:
                t.resume()

    async def cancel(self):
        self.status = TaskStatus.CANCELED
        self._pause_event.set()
        for t in self.sub_tasks:
            await t.cancel()
        
        if self.task_runner:
            self.task_runner.cancel()

    def update_url(self, new_url: str):
        # Not really supported for folders but needed for interface
        pass

    def set_speed_limit(self, limit_kbps: int):
        self.speed_limit = limit_kbps
        # TODO: Implement rate limiting for folder tasks (propagate to subtasks or global limiter)

    def delete_files(self):
        # Delete all files
        import shutil
        if os.path.exists(self.filepath):
            shutil.rmtree(self.filepath)
        if os.path.exists(self.state_file):
            os.remove(self.state_file)
        
        # Delete sub-task states
        for t in self.sub_tasks:
            t.delete_files()
