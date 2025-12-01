import os
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from typing import List, Dict, Optional

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

class DriveManager:
    def __init__(self):
        self.creds = None
        self.service = None
        self.credentials_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'credentials.json')
        self.token_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'token.pickle')
        # Try to load credentials on init, but don't start flow
        self.load_credentials()

    def load_credentials(self):
        if os.path.exists(self.token_path):
            try:
                with open(self.token_path, 'rb') as token:
                    self.creds = pickle.load(token)
                if self.creds and self.creds.valid:
                    self.service = build('drive', 'v3', credentials=self.creds)
            except Exception as e:
                print(f"Error loading credentials: {e}")
                self.creds = None

    def authenticate(self):
        """Shows basic usage of the Drive v3 API.
        Prints the names and ids of the first 10 files the user has access to.
        """
        # The file token.pickle stores the user's access and refresh tokens, and is
        # created automatically when the authorization flow completes for the first
        # time.
        self.load_credentials()
        
        # If there are no (valid) credentials available, let the user log in.
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                try:
                    self.creds.refresh(Request())
                except Exception as e:
                    print(f"Error refreshing token: {e}")
                    self.creds = None
            
            if not self.creds:
                if not os.path.exists(self.credentials_path):
                    print("credentials.json not found.")
                    return

                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_path, SCOPES)
                # Use a fixed port to match the redirect URI in Google Cloud Console
                # Common defaults are 8080, 8000, or 3000. 
                # Trying 8080 as it's a very common default for these flows.
                self.creds = flow.run_local_server(port=8080)
            
            # Save the credentials for the next run
            with open(self.token_path, 'wb') as token:
                pickle.dump(self.creds, token)

        self.service = build('drive', 'v3', credentials=self.creds)

    def is_authenticated(self) -> bool:
        return self.creds is not None and self.creds.valid

    def get_headers(self) -> Dict[str, str]:
        if not self.creds or not self.creds.valid:
            self.authenticate()
        return {"Authorization": f"Bearer {self.creds.token}"}

    def list_files(self, folder_id: str = 'root', page_token: Optional[str] = None) -> Dict:
        if not self.service:
            self.authenticate()
            if not self.service:
                raise Exception("Not authenticated")

        results = self.service.files().list(
            q=f"'{folder_id}' in parents and trashed = false",
            pageSize=100,
            fields="nextPageToken, files(id, name, mimeType, size, webContentLink)",
            pageToken=page_token
        ).execute()
        
        return results

    def get_file_metadata(self, file_id: str) -> Dict:
        if not self.service:
            self.authenticate()
            
        return self.service.files().get(
            fileId=file_id,
            fields="id, name, mimeType, size, webContentLink"
        ).execute()

drive_manager = DriveManager()
