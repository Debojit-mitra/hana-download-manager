import os
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from core.downloader import manager, TaskStatus
from core.settings import settings_manager, Settings

router = APIRouter()

class DownloadRequest(BaseModel):
    url: str
    filename: Optional[str] = None
    auto_extract: bool = False
    speed_limit: int = 0 # kbps
    max_connections: Optional[int] = None

class SpeedLimitRequest(BaseModel):
    limit: int # kbps

@router.post("/downloads")
async def add_download(request: DownloadRequest):
    task_id = await manager.add_task(request.url, request.filename, request.auto_extract, request.speed_limit, request.max_connections)
    return {"id": task_id, "status": "started"}

@router.get("/downloads/check_file")
async def check_file(filename: str):
    settings = settings_manager.settings
    filepath = os.path.join(settings.download_dir, filename)
    exists = os.path.exists(filepath)
    return {"exists": exists}

@router.get("/downloads")
async def list_downloads():
    tasks = manager.get_all_tasks()
    return [
        {
            "id": t.id,
            "url": t.url,
            "filename": t.filename,
            "status": t.status,
            "progress": (t.downloaded_size / t.total_size * 100) if t.total_size > 0 else 0,
            "total_size": t.total_size,
            "downloaded_size": t.downloaded_size,
            "speed": t.speed,
            "speed_limit": t.speed_limit,
            "auto_extract": t.auto_extract,
            "extraction_skipped": t.extraction_skipped,
            "supports_resume": t.supports_resume,
            "error_message": t.error_message
        }
        for t in tasks
    ]

@router.post("/downloads/{task_id}/pause")
async def pause_download(task_id: str):
    task = manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.pause()
    return {"status": "paused"}

@router.post("/downloads/{task_id}/resume")
async def resume_download(task_id: str):
    task = manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await manager.resume_task(task_id)
    return {"status": "resumed"}

@router.delete("/downloads/{task_id}")
async def delete_download(task_id: str, delete_file: bool = False):
    if task_id in manager.tasks:
        task = manager.tasks[task_id]
        if task.status in [TaskStatus.DOWNLOADING, TaskStatus.PAUSED, TaskStatus.PENDING, TaskStatus.QUEUED]:
            await task.cancel()
            # Wait for the task to actually stop to ensure file handles are closed
            if task.task_runner and not task.task_runner.done():
                try:
                    await task.task_runner
                except:
                    pass
            
            # If task was incomplete, force delete files (parts)
            delete_file = True
        
        if delete_file:
            task.delete_files()
            
        del manager.tasks[task_id]
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Task not found")

@router.post("/downloads/{task_id}/limit")
async def set_speed_limit(task_id: str, request: SpeedLimitRequest):
    task = manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.set_speed_limit(request.limit)
    return {"status": "limit set"}

class RefreshLinkRequest(BaseModel):
    url: str

@router.post("/downloads/{task_id}/refresh_link")
async def refresh_link(task_id: str, request: RefreshLinkRequest):
    task = manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.update_url(request.url)
    return {"status": "link updated"}

class RenameRequest(BaseModel):
    filename: str

@router.post("/downloads/{task_id}/rename")
async def rename_download(task_id: str, request: RenameRequest):
    try:
        await manager.rename_task(task_id, request.filename)
        return {"status": "renamed"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/settings")
async def get_settings():
    return settings_manager.settings

@router.post("/settings")
async def update_settings(settings: Settings):
    settings_manager.save_settings(settings)
    # Trigger queue processing in case max_concurrent increased
    await manager.process_queue()
    return settings_manager.settings
