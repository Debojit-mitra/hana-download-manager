from pydantic import BaseModel
import json
import os

class Settings(BaseModel):
    download_dir: str = os.path.join(os.path.expanduser("~"), "Downloads", "HDM")
    max_concurrent_downloads: int = 3
    max_connections_per_task: int = 4
    organize_files: bool = True

class SettingsManager:
    def __init__(self, config_file="settings.json"):
        self.config_file = config_file
        self.settings = Settings()
        self.load_settings()

    def load_settings(self):
        if os.path.exists(self.config_file):
            with open(self.config_file, 'r') as f:
                data = json.load(f)
                self.settings = Settings(**data)
        
        # Override with env var if present (for Docker)
        env_download_dir = os.getenv("DOWNLOAD_DIR")
        if env_download_dir:
            self.settings.download_dir = env_download_dir
        
        # Ensure download dir exists
        if not os.path.exists(self.settings.download_dir):
            os.makedirs(self.settings.download_dir)

    def save_settings(self, new_settings: Settings):
        self.settings = new_settings
        with open(self.config_file, 'w') as f:
            json.dump(self.settings.dict(), f, indent=4)
        
        if not os.path.exists(self.settings.download_dir):
            os.makedirs(self.settings.download_dir)

settings_manager = SettingsManager()
