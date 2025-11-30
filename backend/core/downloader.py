import asyncio
import aiohttp
import aiofiles
import os
import json
from typing import List, Dict, Optional
from enum import Enum
import time
import shutil
from .settings import settings_manager

class TaskStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    PAUSED = "paused"
    EXTRACTING = "extracting"
    COMPLETED = "completed"
    ERROR = "error"
    CANCELED = "canceled"

class RateLimiter:
    def __init__(self, rate_limit_kbps: int):
        self.rate_limit = rate_limit_kbps * 1024 # bytes per second
        self.tokens = self.rate_limit
        self.last_check = time.time()
        self.lock = asyncio.Lock()

    async def wait_for_token(self, amount: int):
        if self.rate_limit <= 0:
            return

        async with self.lock:
            while True:
                now = time.time()
                elapsed = now - self.last_check
                self.tokens += elapsed * self.rate_limit
                if self.tokens > self.rate_limit:
                    self.tokens = self.rate_limit
                self.last_check = now

                if self.tokens >= amount:
                    self.tokens -= amount
                    return
                
                wait_time = (amount - self.tokens) / self.rate_limit
                await asyncio.sleep(wait_time)

class DownloadTask:
    def __init__(self, url: str, filename: str, download_dir: str, num_connections: int = 4, auto_extract: bool = False):
        self.id = str(int(time.time() * 1000))  # Simple ID generation
        self.url = url
        self.filename = filename
        self.download_dir = download_dir
        self.filepath = os.path.join(download_dir, filename)
        self.num_connections = num_connections
        self.auto_extract = auto_extract
        self.status = TaskStatus.PENDING
        self.total_size = 0
        self.downloaded_size = 0
        self.speed = 0
        self.error_message = None
        self.parts_info = []  # List of (start, end, current)
        self.speed = 0
        self.error_message = None
        self.parts_info = []  # List of (start, end, current)
        self.rate_limiter = None
        self.speed_limit = 0 # kbps
        self.extraction_skipped = False
        self.supports_resume = False
        self._cancel_event = asyncio.Event()
        self._pause_event = asyncio.Event()
        self._pause_event.set() # Start unpaused
        self._pause_event = asyncio.Event()
        self._pause_event.set() # Start unpaused
        
        # Hidden parts directory
        self.parts_dir = os.path.join(download_dir, ".parts")
        if not os.path.exists(self.parts_dir):
            os.makedirs(self.parts_dir)
            
        self.state_file = os.path.join(self.parts_dir, f"{filename}.state.json")
        self.task_runner: Optional[asyncio.Task] = None
        self.session: Optional[aiohttp.ClientSession] = None
        self.task_runner: Optional[asyncio.Task] = None
        self.session: Optional[aiohttp.ClientSession] = None

    async def _speed_monitor(self):
        last_save_time = time.time()
        while self.status in [TaskStatus.DOWNLOADING, TaskStatus.PAUSED]:
            start_bytes = self.downloaded_size
            await asyncio.sleep(1)
            end_bytes = self.downloaded_size
            self.speed = end_bytes - start_bytes
            
            # Save state every 5 seconds
            if time.time() - last_save_time > 5:
                self.save_state()
                last_save_time = time.time()

    def set_speed_limit(self, limit_kbps: int):
        self.speed_limit = limit_kbps
        if limit_kbps > 0:
            self.rate_limiter = RateLimiter(limit_kbps)
        else:
            self.rate_limiter = None

    def save_state(self):
        state = {
            "id": self.id,
            "url": self.url,
            "filename": self.filename,
            "total_size": self.total_size,
            "downloaded_size": self.downloaded_size,
            "status": self.status,
            "parts_info": self.parts_info,
            "status": self.status,
            "parts_info": self.parts_info,
            "auto_extract": self.auto_extract,
            "auto_extract": self.auto_extract,
            "speed_limit": self.speed_limit,
            "extraction_skipped": self.extraction_skipped,
            "supports_resume": self.supports_resume,
            "num_connections": self.num_connections
        }
        with open(self.state_file, 'w') as f:
            json.dump(state, f)

    def load_state(self):
        if os.path.exists(self.state_file):
            with open(self.state_file, 'r') as f:
                state = json.load(f)
                self.id = state.get("id", self.id)
                self.total_size = state.get("total_size", 0)
                self.downloaded_size = state.get("downloaded_size", 0)
                self.parts_info = state.get("parts_info", [])
                self.parts_info = state.get("parts_info", [])
                self.auto_extract = state.get("auto_extract", False)
                self.auto_extract = state.get("auto_extract", False)
                self.speed_limit = state.get("speed_limit", 0)
                self.extraction_skipped = state.get("extraction_skipped", False)
                self.supports_resume = state.get("supports_resume", False)
                self.status = state.get("status", TaskStatus.PENDING)
                self.num_connections = state.get("num_connections", self.num_connections)
                return True
        return False

    async def get_file_info(self):
        async with aiohttp.ClientSession() as session:
            async with session.head(self.url) as response:
                if response.status == 200:
                    self.total_size = int(response.headers.get('Content-Length', 0))
                    # Check for Accept-Ranges
                    if response.headers.get('Accept-Ranges') == 'bytes':
                        self.supports_resume = True
                    else:
                        self.supports_resume = False
                        self.num_connections = 1 # Fallback to single connection

    async def download_part(self, session, part_id, start, end, current_pos):
        retries = 0
        max_retries = 5
        part_file = os.path.join(self.parts_dir, f"{self.filename}.part{part_id}")
        
        while retries < max_retries:
            try:
                # Resume from current position
                current_pos = self.parts_info[part_id]['current']
                if current_pos > end:
                    return # Part completed

                bytes_downloaded_in_attempt = 0
                headers = {'Range': f'bytes={current_pos}-{end}'}
                
                async with session.get(self.url, headers=headers) as response:
                    if response.status in [200, 206]:
                        async with aiofiles.open(part_file, 'ab') as f:
                            async for chunk in response.content.iter_chunked(1024 * 64): # 64KB chunks
                                if not self._pause_event.is_set():
                                    self.save_state() # Save state when paused
                                    await self._pause_event.wait()
                                if self.status == TaskStatus.CANCELED:
                                    return
                                
                                if self.rate_limiter:
                                    await self.rate_limiter.wait_for_token(len(chunk))

                                await f.write(chunk)
                                self.downloaded_size += len(chunk)
                                self.parts_info[part_id]['current'] += len(chunk)
                                
                                # If we successfully download a significant amount (e.g. 500KB),
                                # we consider the connection healthy and reset the retry counter.
                                # This prevents cumulative errors over a long download from causing failure.
                                bytes_downloaded_in_attempt += len(chunk)
                                if bytes_downloaded_in_attempt > 500 * 1024: # 500KB
                                    retries = 0
                                    bytes_downloaded_in_attempt = 0 # Reset tracker to avoid constant assignment
                
                # If we get here, the download stream finished normally
                return

            except (aiohttp.ClientPayloadError, aiohttp.ClientError, asyncio.TimeoutError) as e:
                retries += 1
                print(f"Part {part_id} failed (attempt {retries}/{max_retries}): {e}")
                if retries >= max_retries:
                    print(f"Error downloading part {part_id}: {e}")
                    self.error_message = f"Failed after {max_retries} retries: {str(e)}"
                    self.status = TaskStatus.ERROR
                    self.save_state()
                    
                    # Cancel other parts immediately
                    if hasattr(self, 'active_tasks'):
                        for t in self.active_tasks:
                            if t is not asyncio.current_task() and not t.done():
                                t.cancel()
                    return
                
                # Wait before retrying (exponential backoff)
                await asyncio.sleep(1 * retries)
            
            except Exception as e:
                # Non-recoverable error
                print(f"Critical error in part {part_id}: {e}")
                self.error_message = str(e)
                self.status = TaskStatus.ERROR
                self.save_state()
                
                if hasattr(self, 'active_tasks'):
                    for t in self.active_tasks:
                        if t is not asyncio.current_task() and not t.done():
                            t.cancel()
                return

    async def start(self):
        self.status = TaskStatus.DOWNLOADING
        await self.get_file_info()
        
        if not self.parts_info:
            if self.total_size == 0:
                # Handle unknown size or single stream
                self.num_connections = 1
                self.parts_info = [{'start': 0, 'end': '', 'current': 0}]
            else:
                # Calculate parts
                part_size = self.total_size // self.num_connections
                self.parts_info = []
                for i in range(self.num_connections):
                    start = i * part_size
                    end = (i + 1) * part_size - 1 if i < self.num_connections - 1 else self.total_size - 1
                    self.parts_info.append({'start': start, 'end': end, 'current': start})

        self.session = aiohttp.ClientSession()
        try:
            self.active_tasks = []
            self.active_tasks = []
            for i, part in enumerate(self.parts_info):
                # Sync part info with actual file size on disk to prevent corruption
                part_file = os.path.join(self.parts_dir, f"{self.filename}.part{i}")
                if os.path.exists(part_file):
                    actual_size = os.path.getsize(part_file)
                    expected_size = part['current'] - part['start']
                    
                    if actual_size != expected_size:
                        # Trust the file on disk. If we downloaded more/less than state says,
                        # we should resume from where the file actually ends.
                        part['current'] = part['start'] + actual_size
                        
                t = asyncio.create_task(self.download_part(self.session, i, part['start'], part['end'], part['current']))
                self.active_tasks.append(t)
            
            # Recalculate total downloaded size based on synced parts
            self.downloaded_size = sum(p['current'] - p['start'] for p in self.parts_info)
            
            # Start speed monitor
            monitor_task = asyncio.create_task(self._speed_monitor())
            
            try:
                await asyncio.gather(*self.active_tasks)
            except asyncio.CancelledError:
                if self.status != TaskStatus.ERROR:
                    self.status = TaskStatus.CANCELED
            except Exception as e:
                self.status = TaskStatus.ERROR
                self.error_message = str(e)
            finally:
                monitor_task.cancel()
        finally:
            if self.session and not self.session.closed:
                await self.session.close()

        if self.status != TaskStatus.ERROR and self.status != TaskStatus.CANCELED:
            await self.merge_parts()
            self.status = TaskStatus.COMPLETED
            
            if self.status == TaskStatus.COMPLETED:
                self.save_state() # Ensure final state is saved (completed status)

    async def extract(self):
        if not self.auto_extract:
            return

        # Check if file is a supported archive
        supported_exts = ['.zip', '.tar', '.gz', '.rar', '.7z']
        ext = os.path.splitext(self.filename)[1].lower()
        
        if ext not in supported_exts:
            self.extraction_skipped = True
            self.status = TaskStatus.COMPLETED
            return

        self.status = TaskStatus.EXTRACTING
        # Run extraction in a separate thread to avoid blocking
        from .extractor import extract_file
        loop = asyncio.get_event_loop()
        success, msg = await loop.run_in_executor(None, extract_file, self.filepath)
        if not success:
            self.error_message = msg
            self.status = TaskStatus.ERROR
        else:
            self.status = TaskStatus.COMPLETED

    async def merge_parts(self):
        async with aiofiles.open(self.filepath, 'wb') as outfile:
            for i in range(self.num_connections):
                part_file = os.path.join(self.parts_dir, f"{self.filename}.part{i}")
                if os.path.exists(part_file):
                    async with aiofiles.open(part_file, 'rb') as infile:
                        while True:
                            chunk = await infile.read(1024 * 1024) # 1MB
                            if not chunk:
                                break
                            await outfile.write(chunk)
                    os.remove(part_file)

    def pause(self):
        self.status = TaskStatus.PAUSED
        self._pause_event.clear()

    def resume(self):
        if self.status == TaskStatus.COMPLETED:
            return
        self.status = TaskStatus.DOWNLOADING
        self._pause_event.set()

    async def cancel(self):
        self.status = TaskStatus.CANCELED
        self._pause_event.set() # Ensure it unblocks to check cancel status
        
        # Force close session to kill connections immediately
        if self.session and not self.session.closed:
            await self.session.close()

        if hasattr(self, 'active_tasks'):
            for t in self.active_tasks:
                if not t.done():
                    t.cancel()

    def delete_files(self):
        try:
            if os.path.exists(self.filepath):
                os.remove(self.filepath)
            if os.path.exists(self.state_file):
                os.remove(self.state_file)
            # Remove parts if any
            for i in range(self.num_connections):
                part_file = os.path.join(self.parts_dir, f"{self.filename}.part{i}")
                if os.path.exists(part_file):
                    os.remove(part_file)
        except Exception as e:
            print(f"Error deleting files: {e}")

class DownloadManager:
    def __init__(self):
        self.tasks: Dict[str, DownloadTask] = {}
        self.load_tasks()

    def load_tasks(self):
        settings = settings_manager.settings
        parts_dir = os.path.join(settings.download_dir, ".parts")
        if not os.path.exists(parts_dir):
            return

        for filename in os.listdir(parts_dir):
            if filename.endswith(".state.json"):
                try:
                    filepath = os.path.join(parts_dir, filename)
                    with open(filepath, 'r') as f:
                        state = json.load(f)
                    
                    # Reconstruct task
                    url = state.get("url", "")
                    fname = state.get("filename", "")
                    auto_extract = state.get("auto_extract", False)
                    
                    if not url or not fname:
                        continue

                    task = DownloadTask(url, fname, settings.download_dir, settings.max_connections_per_task, auto_extract)
                    task.load_state()
                    
                    # If task was downloading/extracting, set to PAUSED to avoid auto-start storm
                    if task.status in [TaskStatus.DOWNLOADING, TaskStatus.EXTRACTING]:
                        task.status = TaskStatus.PAUSED
                    
                    self.tasks[task.id] = task
                except Exception as e:
                    print(f"Error loading task state {filename}: {e}")

    def get_unique_filename(self, filename: str) -> str:
        settings = settings_manager.settings
        filepath = os.path.join(settings.download_dir, filename)
        if not os.path.exists(filepath):
            return filename
        
        base, ext = os.path.splitext(filename)
        counter = 1
        while True:
            new_filename = f"{base} ({counter}){ext}"
            if not os.path.exists(os.path.join(settings.download_dir, new_filename)):
                return new_filename
            counter += 1

    async def add_task(self, url: str, filename: str = None, auto_extract: bool = False, speed_limit: int = 0, max_connections: int = None):
        if not filename:
            filename = url.split('/')[-1] or "downloaded_file"
        
        # Auto-rename if exists
        filename = self.get_unique_filename(filename)
        
        settings = settings_manager.settings
        # Use provided max_connections or fallback to settings
        connections = max_connections if max_connections and max_connections > 0 else settings.max_connections_per_task
        
        task = DownloadTask(url, filename, settings.download_dir, connections, auto_extract)
        
        if speed_limit > 0:
            task.set_speed_limit(speed_limit)

        self.tasks[task.id] = task
        
        task.save_state() # Save initial state
        
        await self.process_queue()
        return task.id

    async def resume_task(self, task_id: str):
        task = self.tasks.get(task_id)
        if not task:
            return
        
        if task.status == TaskStatus.COMPLETED:
            return

        # If task is already running (has a runner and not done), just resume event
        if task.task_runner and not task.task_runner.done():
            task.resume()
        else:
            # Task is cold (restored from disk or error), needs to be restarted
            task.status = TaskStatus.QUEUED
            await self.process_queue()

    async def process_queue(self):
        settings = settings_manager.settings
        active_downloads = sum(1 for t in self.tasks.values() if t.status == TaskStatus.DOWNLOADING)
        
        if active_downloads < settings.max_concurrent_downloads:
            # Find queued tasks
            for task in self.tasks.values():
                if task.status == TaskStatus.PENDING or task.status == TaskStatus.QUEUED:
                    if active_downloads < settings.max_concurrent_downloads:
                        task.status = TaskStatus.DOWNLOADING
                        task.task_runner = asyncio.create_task(self._run_task(task))
                        active_downloads += 1
                    else:
                        task.status = TaskStatus.QUEUED

    async def _run_task(self, task: DownloadTask):
        await task.start()
        # After task finishes (complete or error), process queue again
        if task.status == TaskStatus.COMPLETED:
            if settings_manager.settings.organize_files:
                self.organize_file(task)
            
            if task.auto_extract:
                await task.extract()
        
        await self.process_queue()

    def organize_file(self, task: DownloadTask):
        try:
            ext = os.path.splitext(task.filename)[1].lower()
            category = "Others"
            if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
                category = "Images"
            elif ext in ['.mp4', '.mkv', '.avi', '.mov']:
                category = "Videos"
            elif ext in ['.mp3', '.wav', '.flac']:
                category = "Music"
            elif ext in ['.zip', '.rar', '.7z', '.tar', '.gz']:
                category = "Archives"
            elif ext in ['.exe', '.msi', '.deb', '.rpm']:
                category = "Programs"
            elif ext in ['.pdf', '.doc', '.docx', '.txt']:
                category = "Documents"

            target_dir = os.path.join(task.download_dir, category)
            if not os.path.exists(target_dir):
                os.makedirs(target_dir)
            
            new_path = os.path.join(target_dir, task.filename)
            shutil.move(task.filepath, new_path)
            task.filepath = new_path # Update path
        except Exception as e:
            print(f"Error organizing file: {e}")

    def get_task(self, task_id: str):
        return self.tasks.get(task_id)

    def get_all_tasks(self):
        return self.tasks.values()

manager = DownloadManager()
