from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import os
import shutil
from core.drive import drive_manager
from core.downloader import manager

router = APIRouter()

class CloneRequest(BaseModel):
    file_id: str
    name: str
    mime_type: str
    size: Optional[str] = None
    auto_extract: bool = False
    speed_limit: int = 0
    max_connections: Optional[int] = None

@router.get("/drive/auth")
async def drive_auth():
    """
    Initiates the Google Drive authentication flow.
    In a real web app, this would redirect the user.
    For now, it relies on the local console flow or existing token.
    """
    try:
        drive_manager.authenticate()
        return {"status": "authenticated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/drive/status")
async def drive_status():
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    credentials_path = os.path.join(backend_dir, 'credentials.json')
    has_credentials = os.path.exists(credentials_path)
    
    return {
        "is_authenticated": drive_manager.is_authenticated(),
        "has_credentials": has_credentials
    }

@router.get("/drive/metadata")
async def get_drive_metadata(file_id: str):
    try:
        return drive_manager.get_file_metadata(file_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/drive/files")
async def list_drive_files(folder_id: str = 'root', page_token: Optional[str] = None):
    try:
        return drive_manager.list_files(folder_id, page_token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/drive/clone")
async def clone_drive_file(request: CloneRequest, background_tasks: BackgroundTasks):
    try:
        # If it's a folder, we need recursive logic
        if request.mime_type == 'application/vnd.google-apps.folder':
             task_id = await manager.add_drive_folder_task(
                 request.file_id, 
                 request.name,
                 auto_extract=request.auto_extract,
                 speed_limit=request.speed_limit,
                 max_connections=request.max_connections
             )
             return {"status": "started", "task_id": task_id}
        
        # It's a file
        headers = drive_manager.get_headers()
        url = f"https://www.googleapis.com/drive/v3/files/{request.file_id}?alt=media"
        
        task_id = await manager.add_task(
            url=url,
            filename=request.name,
            headers=headers,
            auto_extract=request.auto_extract,
            speed_limit=request.speed_limit,
            max_connections=request.max_connections
        )
        return {"status": "started", "task_id": task_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/drive/credentials")
async def upload_drive_credentials(file: UploadFile = File(...)):
    try:
        # Define path to credentials.json (same directory as main.py/core)
        # Assuming drive_routes is in backend/api, we want backend/credentials.json
        # drive_manager uses: os.path.join(os.path.dirname(os.path.dirname(__file__)), 'credentials.json')
        # which is backend/credentials.json
        
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        credentials_path = os.path.join(backend_dir, 'credentials.json')
        
        with open(credentials_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Reset drive manager to reload credentials
        drive_manager.creds = None
        drive_manager.service = None
        if os.path.exists(drive_manager.token_path):
            os.remove(drive_manager.token_path) # Force re-auth with new creds
            
        return {"status": "uploaded", "message": "Credentials uploaded successfully. Please authenticate."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
