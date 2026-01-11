import zipfile
import tarfile
import os
import shutil
import py7zr

def extract_file(filepath: str, extract_to: str = None):
    if not os.path.exists(filepath):
        return False, "File not found"

    if extract_to is None:
        extract_to = os.path.splitext(filepath)[0] # Create folder with same name

    try:
        if filepath.endswith('.zip'):
            with zipfile.ZipFile(filepath, 'r') as zip_ref:
                zip_ref.extractall(extract_to)
        elif filepath.endswith('.tar.gz') or filepath.endswith('.tgz') or filepath.endswith('.tar'):
            with tarfile.open(filepath, 'r:*') as tar_ref:
                tar_ref.extractall(extract_to)
        elif filepath.endswith('.7z'):
            with py7zr.SevenZipFile(filepath, mode='r') as z:
                z.extractall(path=extract_to)
        else:
            return False, "Unsupported format"
        
        return True, f"Extracted to {extract_to}"
    except Exception as e:
        return False, str(e)
