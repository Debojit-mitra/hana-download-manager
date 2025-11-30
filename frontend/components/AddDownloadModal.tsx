"use client";

import { useState, useEffect } from "react";
import { addDownload, checkFileExists, fetchSettings } from "@/lib/api";
import { Plus, X, AlertTriangle } from "lucide-react";
import { sliderToSpeed, speedToSlider } from "@/lib/utils";
import { useDownloads } from "@/lib/download-context";

export default function AddDownloadModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [filename, setFilename] = useState("");
  const [autoExtract, setAutoExtract] = useState(false);
  const [speedLimit, setSpeedLimit] = useState(0);
  const [maxConnections, setMaxConnections] = useState(0);
  const [defaultMaxConnections, setDefaultMaxConnections] = useState(4); // Default fallback
  const [fileExists, setFileExists] = useState(false);

  useEffect(() => {
    fetchSettings().then((settings) => {
      setDefaultMaxConnections(settings.max_connections_per_task);
      if (maxConnections === 0) {
        setMaxConnections(settings.max_connections_per_task);
      }
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

  const { refreshTasks } = useDownloads();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setIsOpen(false);
      setUrl("");
      setFilename("");
      setAutoExtract(false);
      setSpeedLimit(0);
      setMaxConnections(defaultMaxConnections);
      setFileExists(false);
    } catch (e) {
      alert("Failed to add download");
    }
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
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">
              URL
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
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
                onChange={(e) => setMaxConnections(parseInt(e.target.value))}
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
