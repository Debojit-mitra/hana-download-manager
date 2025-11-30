"use client";

import { useState } from "react";
import { refreshDownloadLink } from "@/lib/api";
import { X, RefreshCw } from "lucide-react";
import { useDownloads } from "@/lib/download-context";

interface RefreshLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  currentUrl: string;
}

export default function RefreshLinkModal({
  isOpen,
  onClose,
  taskId,
  currentUrl,
}: RefreshLinkModalProps) {
  const [url, setUrl] = useState(currentUrl);
  const [loading, setLoading] = useState(false);
  const { refreshTasks } = useDownloads();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await refreshDownloadLink(taskId, url);
      await refreshTasks();
      onClose();
    } catch (e) {
      alert("Failed to refresh link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <RefreshCw size={20} />
            Refresh Download Link
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Enter the new URL for this download. This is useful if the original
            link has expired.
          </p>
          <div>
            <label className="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">
              New URL
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
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-pink-500 dark:bg-pink-600 hover:bg-pink-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? "Updating..." : "Update Link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
