export const API_BASE_URL = "/api";

export interface DownloadTask {
  id: string;
  url: string;
  filename: string;
  status:
    | "pending"
    | "downloading"
    | "paused"
    | "completed"
    | "error"
    | "canceled"
    | "extracting";
  progress: number;
  total_size: number;
  downloaded_size: number;
  speed: number;
  speed_limit: number;
  auto_extract: boolean;
  extraction_skipped: boolean;
  supports_resume: boolean;
  error_message?: string;
  completed_at?: number;
}

export async function fetchDownloads(): Promise<DownloadTask[]> {
  const res = await fetch(`${API_BASE_URL}/downloads`);
  if (!res.ok) throw new Error("Failed to fetch downloads");
  return res.json();
}

export async function addDownload(
  url: string,
  filename?: string,
  auto_extract: boolean = false,
  speed_limit: number = 0,
  max_connections?: number
) {
  const res = await fetch(`${API_BASE_URL}/downloads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      filename,
      auto_extract,
      speed_limit,
      max_connections,
    }),
  });
  if (!res.ok) throw new Error("Failed to add download");
  return res.json();
}

export async function checkFileExists(filename: string): Promise<boolean> {
  const res = await fetch(
    `${API_BASE_URL}/downloads/check_file?filename=${encodeURIComponent(
      filename
    )}`
  );
  if (!res.ok) return false;
  const data = await res.json();
  return data.exists;
}

export async function pauseDownload(id: string) {
  await fetch(`${API_BASE_URL}/downloads/${id}/pause`, { method: "POST" });
}

export async function setSpeedLimit(id: string, limit: number) {
  await fetch(`${API_BASE_URL}/downloads/${id}/limit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit }),
  });
}

export async function refreshDownloadLink(id: string, url: string) {
  await fetch(`${API_BASE_URL}/downloads/${id}/refresh_link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

export async function renameDownload(id: string, filename: string) {
  const res = await fetch(`${API_BASE_URL}/downloads/${id}/rename`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || "Failed to rename");
  }
}

export async function resumeDownload(id: string) {
  await fetch(`${API_BASE_URL}/downloads/${id}/resume`, { method: "POST" });
}

export async function cancelDownload(id: string, deleteFile: boolean = false) {
  await fetch(`${API_BASE_URL}/downloads/${id}?delete_file=${deleteFile}`, {
    method: "DELETE",
  });
}

export interface Settings {
  download_dir: string;
  max_concurrent_downloads: number;
  max_connections_per_task: number;
  organize_files: boolean;
}

export async function fetchSettings(): Promise<Settings> {
  const res = await fetch(`${API_BASE_URL}/settings`);
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

export async function updateSettings(settings: Settings): Promise<Settings> {
  const res = await fetch(`${API_BASE_URL}/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}

/// ====================================
/// ========= Google Drive API =========
/// ====================================

export async function getDriveStatus(): Promise<{
  is_authenticated: boolean;
  has_credentials: boolean;
}> {
  const res = await fetch(`${API_BASE_URL}/drive/status`);
  if (!res.ok) throw new Error("Failed to fetch drive status");
  return res.json();
}

export async function initiateDriveAuth(redirectUri?: string): Promise<{
  status: string;
  auth_url?: string;
}> {
  const url = new URL(`${API_BASE_URL}/drive/auth`);
  if (redirectUri) {
    url.searchParams.append("redirect_uri", redirectUri);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to initiate drive auth");
  return res.json();
}

export async function verifyDriveAuth(
  code: string,
  redirectUri?: string
): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE_URL}/drive/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      redirect_uri: redirectUri || "http://localhost:8080/",
    }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || "Failed to verify code");
  }
  return res.json();
}

export async function uploadDriveCredentials(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/drive/credentials`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || "Failed to upload credentials");
  }
  return res.json();
}

export async function getDriveFileMetadata(
  fileId: string
): Promise<{ id: string; name: string; mimeType: string; size?: string }> {
  const res = await fetch(
    `${API_BASE_URL}/drive/metadata?file_id=${encodeURIComponent(fileId)}`
  );
  if (!res.ok) throw new Error("Failed to fetch drive file metadata");
  return res.json();
}

export async function cloneDriveFile(
  fileId: string,
  name: string,
  mimeType: string,
  autoExtract: boolean = false,
  speedLimit: number = 0,
  maxConnections: number = 0
) {
  const res = await fetch(`${API_BASE_URL}/drive/clone`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_id: fileId,
      name,
      mime_type: mimeType,
      auto_extract: autoExtract,
      speed_limit: speedLimit,
      max_connections: maxConnections > 0 ? maxConnections : undefined,
    }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || "Failed to clone drive file");
  }
  return res.json();
}
