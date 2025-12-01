# Hana Download Manager

A modern, high-performance download manager built with **Next.js** (Frontend) and **FastAPI** (Backend).

<p align="center">
<img src="https://i.ibb.co/kstj1x9S/hdm.webp" alt="Hana Download Manager" width="300" >
</p>

## Features

- 🚀 **High Speed**: Multi-threaded downloading with concurrent connections.
- ⏯️ **Resume Capability**: Pause and resume downloads anytime (if supported by server).
- ⚡ **Speed Limiter**: Precise bandwidth control (KB/s to MB/s).
- 📦 **Auto-Extraction**: Automatically extracts archives (`.zip`, `.rar`, `.tar`, etc.) upon completion.
- 🔍 **Smart Skipping**: Intelligent auto-extract skips non-archive files even if enabled.
- 🐳 **Dockerized**: Easy deployment with Docker Compose.
- 📂 **File Organization**: (Optional) Auto-organize files by category.
- ☁️ **Google Drive Support**: Download public/private files and **entire folders** directly.

## Tech Stack

- **Frontend**: Next.js, TailwindCSS, Lucide Icons.
- **Backend**: Python, FastAPI, Aiohttp, Uvicorn.
- **State Management**: JSON-based persistence for resume capability.

## Quick Start (Docker)

The easiest way to run Hana Download Manager is with Docker.

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/Debojit-mitra/hana-download-manager.git
    cd hana-download-manager
    ```

2.  **Run with Docker Compose**:

    ```bash
    docker-compose up --build
    ```

3.  **Access the App**:
    - Frontend: [http://localhost:3000](http://localhost:3000)
    - Backend API: [http://localhost:8000](http://localhost:8000)
    - Downloads: Files will appear in the `downloads/` folder in your project root.

### Configuration (Docker)

You can configure the download directory in `docker-compose.yml`:

```yaml
services:
  backend:
    volumes:
      - /path/to/your/downloads/HDM:/app/downloads/HDM # Map to any local folder
    environment:
      - DOWNLOAD_DIR=/app/downloads/HDM
```

## Manual Installation

If you prefer running without Docker:

### Backend

1.  Navigate to `backend/`:
    ```bash
    cd backend
    ```
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # Linux/Mac
    # venv\Scripts\activate   # Windows
    ```
3.  Install dependencies:

    ```bash
    pip install -r requirements.txt
    ```

4.  Run the server:
    ```bash
    uvicorn main:app --reload
    ```

### Frontend

1.  Navigate to `frontend/`:
    ```bash
    cd frontend
    ```

2.  Set up .env file:
    ```bash
    cp .env.example .env
    ```

3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Run the development server:
    ```bash
    npm run dev
    ```

## Google Drive Integration

Hana Download Manager supports downloading files and folders directly from Google Drive.

### Setup

1.  **Get Credentials**:

    - Go to [Google Cloud Console](https://console.cloud.google.com/).
    - Create a project and enable the **Google Drive API**.
    - Create **OAuth 2.0 Client IDs** (Desktop App).
    - Download the `credentials.json` file.
    - Remeber to add test users that is email id or else it will not work.

2.  **Connect in App**:
    - Go to **Settings** in Hana Download Manager.
    - Upload your `credentials.json`.
    - Click **Connect Google Drive**.

### Authentication Flow

- **Auto-Connect**: If you add your app's URL (e.g., `http://localhost:3000/settings`) to the "Authorized redirect URIs" in Google Cloud Console, the app will connect automatically.
- **Manual Connect**: If not, you can simply copy the **full URL** of the redirect page (even if it fails to load) and paste it into the app to verify.

## License

This project is licensed under the [MIT License](LICENSE).

### Made with ❤️ by Debojit
