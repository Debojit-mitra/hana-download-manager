export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

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
