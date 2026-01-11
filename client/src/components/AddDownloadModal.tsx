"use client";

import { useState, useEffect } from "react";
import {
  addDownload,
  checkFileExists,
  fetchSettings,
  cloneDriveFile,
  getDriveFileMetadata,
  getDriveStatus,
} from "@/contexts/api";
import {
  Plus,
  X,
  AlertTriangle,
  Link as LinkIcon,
  HardDrive,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { sliderToSpeed, speedToSlider } from "@/contexts/utils";
import { useDownloads } from "@/contexts/download-context";
import { useRouter } from "next/navigation";

// Robust ID extraction
function extractDriveId(url: string): string | null {
  try {
    // Basic check to ensure it looks like a google URL
    if (!url.includes("google.com") && !url.includes("googleusercontent.com")) {
      // Allow direct ID inputs if they are long enough?
      // The user prompt said: "if we put different link it gives errors"
      // So we should be strict about valid usage.
      // But what if user just pastes the ID?
      // Let's support pure IDs if they match the loose regex, BUT only if they don't look like a URL (no http/www)
      if (!url.startsWith("http") && !url.includes(".") && !url.includes("/")) {
        if (url.match(/^[-_\w]{25,}$/)) return url;
      }
      return null;
    }

    const patterns = [
      /\/file\/d\/([-_\w]+)/,
      /\/folders\/([-_\w]+)/,
      /[?&]id=([-_\w]+)/,
      /\/d\/([-_\w]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
  } catch (e) {
    return null;
  }
  return null;
}

export default function AddDownloadModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [filename, setFilename] = useState("");
  const [autoExtract, setAutoExtract] = useState(false);
  const [speedLimit, setSpeedLimit] = useState(0);
  const [maxConnections, setMaxConnections] = useState(0);
  const [defaultMaxConnections, setDefaultMaxConnections] = useState(4); // Default fallback
  const [fileExists, setFileExists] = useState(false);

  const [activeTab, setActiveTab] = useState<"url" | "drive">("url");
  const [driveLink, setDriveLink] = useState("");
  const [userDriveName, setUserDriveName] = useState("");
  const [fetchedDriveName, setFetchedDriveName] = useState("");
  const [driveMimeType, setDriveMimeType] = useState(
    "application/octet-stream"
  ); // Default fallback
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDriveAuth, setIsDriveAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings().then((settings) => {
      setDefaultMaxConnections(settings.max_connections_per_task);
      if (maxConnections === 0) {
        setMaxConnections(settings.max_connections_per_task);
      }
    });

    getDriveStatus().then((status) => {
      setIsDriveAuth(status.is_authenticated);
    });
  }, []);

  // Check file existence when filename changes
  useEffect(() => {
    const check = async () => {
      if (!filename) {
        setFileExists(false);
        return;
      }
      const exists = await checkFileExists(filename);
      setFileExists(exists);
    };
    const timeout = setTimeout(check, 500); // Debounce
    return () => clearTimeout(timeout);
  }, [filename]);

  // Auto-fetch Drive Metadata
  useEffect(() => {
    const fetchMeta = async () => {
      setError(null); // Clear error when link changes
      const fileId = extractDriveId(driveLink);
      if (!fileId) return;

      setFetchingMetadata(true);
      try {
        const meta = await getDriveFileMetadata(fileId);
        setFetchedDriveName(meta.name);
        setDriveMimeType(meta.mimeType);
      } catch (e) {
        console.error("Failed to fetch metadata", e);
        // Don't show public error for auto-fetch, just log it, unless user tries to submit
      } finally {
        setFetchingMetadata(false);
      }
    };

    const timeout = setTimeout(fetchMeta, 800); // Debounce
    return () => clearTimeout(timeout);
  }, [driveLink]);

  const { refreshTasks } = useDownloads();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (activeTab === "url") {
      if (!url) return;
      try {
        await addDownload(
          url,
          filename || undefined,
          autoExtract,
          speedLimit,
          maxConnections
        );
        await refreshTasks();
        resetForm();
      } catch (e) {
        setError("Failed to add download");
      }
    } else {
      // Drive Logic
      const finalName = userDriveName || fetchedDriveName;
      if (!driveLink) return;

      const fileId = extractDriveId(driveLink);

      if (!fileId) {
        setError("Invalid Google Drive Link");
        return;
      }

      if (!finalName) {
        setError("Please wait for metadata fetch or enter a name manually");
        return;
      }

      // Determine mime type (heuristic or user input? For now assume folder if link says 'folders')
      let mime = driveMimeType;
      if (driveLink.includes("/folders/")) {
        mime = "application/vnd.google-apps.folder";
      }

      try {
        await cloneDriveFile(
          fileId,
          finalName,
          mime,
          autoExtract,
          speedLimit,
          maxConnections
        );
        await refreshTasks();
        resetForm();
      } catch (e) {
        setError("Failed to clone Drive file: " + e);
      }
    }
  };

  const resetForm = () => {
    setIsOpen(false);
    setUrl("");
    setFilename("");
    setAutoExtract(false);
    setSpeedLimit(0);
    setMaxConnections(defaultMaxConnections);
    setFileExists(false);
    setDriveLink("");
    setUserDriveName("");
    setFetchedDriveName("");
    setDriveMimeType("application/octet-stream");
    setError(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 bg-pink-500 dark:bg-pink-600 hover:bg-pink-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105"
      >
        <Plus size={24} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
          <h2 className="font-semibold text-lg">Add Download</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-100 dark:border-neutral-800">
          <button
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "url"
                ? "border-pink-500 text-pink-600 dark:text-pink-400"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
            onClick={() => {
              setActiveTab("url");
              setError(null);
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <LinkIcon size={16} />
              <span>URL</span>
            </div>
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "drive"
                ? "border-pink-500 text-pink-600 dark:text-pink-400"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
            onClick={() => {
              if (!isDriveAuth) {
                setIsOpen(false);
                router.push("/settings");
                return;
              }
              setActiveTab("drive");
              setError(null);
            }}
            title={!isDriveAuth ? "Click to authorize in Settings" : ""}
          >
            <div className="flex items-center justify-center gap-2">
              <HardDrive size={16} />
              <span>Google Drive</span>
              {!isDriveAuth && (
                <span className="text-[10px] font-bold bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-pink-500 dark:text-pink-600">
                  Auth Required
                </span>
              )}
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {activeTab === "url" ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">
                  URL
                </label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="https://example.com/file.zip"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">
                  Filename (Optional)
                </label>
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="file.zip"
                />
                {fileExists && (
                  <div className="flex items-start gap-2 mt-2 text-amber-600 text-xs bg-amber-50 p-2 rounded-lg">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>
                      Warning: File exists. It will be saved as &quot;
                      {filename.split(".")[0]} (1).
                      {filename.split(".").slice(1).join(".")}&quot;
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">
                  Drive Link or ID
                </label>
                <input
                  type="text"
                  required
                  value={driveLink}
                  onChange={(e) => {
                    setDriveLink(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="https://drive.google.com/..."
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Supports file and folder links.
                </p>
                {fetchedDriveName && (
                  <p className="text-xs text-pink-600 dark:text-pink-400 mt-1 font-medium">
                    Detected: {fetchedDriveName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">
                  Name (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={userDriveName}
                    onChange={(e) => setUserDriveName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-pink-500 pr-8"
                    placeholder={fetchedDriveName || "My Folder or file.zip"}
                  />
                  {fetchingMetadata && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Advanced Options (Collapsible) */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors w-full py-2"
            >
              {showAdvanced ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
              Advanced Options
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                <div>
                  <label className="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">
                    Speed Limit:{" "}
                    <span className="text-pink-500 dark:text-pink-400 font-bold">
                      {speedLimit === 0
                        ? "Unlimited"
                        : speedLimit < 1024
                        ? `${speedLimit} KB/s`
                        : `${(speedLimit / 1024).toFixed(1)} MB/s`}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={speedToSlider(speedLimit)}
                    onChange={(e) =>
                      setSpeedLimit(sliderToSpeed(parseInt(e.target.value)))
                    }
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer dark:bg-neutral-700 accent-pink-600"
                  />
                  <div className="relative w-full h-4 mt-1 text-xs text-neutral-500">
                    <span className="absolute left-0">Unlimited</span>
                    <span className="absolute left-[30%] -translate-x-1/2">
                      1 MB/s
                    </span>
                    <span className="absolute right-0">50 MB/s</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">
                    Max Connections:{" "}
                    <span className="text-pink-500 dark:text-pink-400 font-bold">
                      {maxConnections}
                      {maxConnections === defaultMaxConnections && " (Default)"}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="1"
                      max="16"
                      step="1"
                      value={maxConnections || defaultMaxConnections}
                      onChange={(e) =>
                        setMaxConnections(parseInt(e.target.value))
                      }
                      className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer dark:bg-neutral-700 accent-pink-600 relative z-10"
                    />
                    {/* Default marker */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-neutral-400 dark:bg-neutral-500 pointer-events-none"
                      style={{
                        left: `${((defaultMaxConnections - 1) / 15) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="relative w-full h-4 mt-1 text-xs text-neutral-500">
                    <span className="absolute left-0">1</span>
                    <span
                      className="absolute -translate-x-1/2"
                      style={{
                        left: `${((defaultMaxConnections - 1) / 15) * 100}%`,
                      }}
                    >
                      Default
                    </span>
                    <span className="absolute right-0">16</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoExtract"
                    checked={autoExtract}
                    onChange={(e) => setAutoExtract(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-pink-600 focus:ring-pink-500 accent-pink-500 dark:accent-pink-600"
                  />
                  <label
                    htmlFor="autoExtract"
                    className="text-sm text-neutral-700 dark:text-neutral-200 select-none cursor-pointer"
                  >
                    Auto Extract (zip, tar, etc.)
                  </label>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/10 p-2 rounded-lg flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-pink-500 dark:bg-pink-600 hover:bg-pink-700 text-white rounded-lg"
            >
              Start Download
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
