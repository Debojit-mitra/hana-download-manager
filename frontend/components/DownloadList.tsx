"use client";

import { useState } from "react";
import {
  pauseDownload,
  resumeDownload,
  cancelDownload,
  setSpeedLimit,
} from "@/lib/api";
import { formatBytes, cn, sliderToSpeed, speedToSlider } from "@/lib/utils";
import {
  Play,
  Pause,
  X,
  File,
  Loader2,
  Gauge,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  FileCode,
  FileText,
} from "lucide-react";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { useDownloads } from "@/lib/download-context";

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return <File size={20} />;

  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
    return <ImageIcon size={20} />;
  if (["mp4", "mkv", "avi", "mov", "webm"].includes(ext))
    return <Video size={20} />;
  if (["mp3", "wav", "flac", "m4a"].includes(ext)) return <Music size={20} />;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext))
    return <Archive size={20} />;
  if (["js", "ts", "py", "html", "css", "json"].includes(ext))
    return <FileCode size={20} />;
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext))
    return <FileText size={20} />;

  return <File size={20} />;
}

export default function DownloadList() {
  const { tasks } = useDownloads();
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    taskId: string;
    filename: string;
    isCompleted: boolean;
  }>({
    isOpen: false,
    taskId: "",
    filename: "",
    isCompleted: false,
  });
  const [limitModal, setLimitModal] = useState<{
    isOpen: boolean;
    taskId: string;
    currentLimit: number;
  }>({
    isOpen: false,
    taskId: "",
    currentLimit: 0,
  });
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  // useEffect removed as it's handled in context

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === "active") return t.status !== "completed";
    return t.status === "completed";
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800 mb-4">
        <button
          onClick={() => setActiveTab("active")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "active"
              ? "border-pink-500 dark:border-pink-600 text-pink-500"
              : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          )}
        >
          Downloading ({tasks.filter((t) => t.status !== "completed").length})
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "completed"
              ? "border-pink-500 dark:border-pink-600 text-pink-500"
              : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          )}
        >
          Completed ({tasks.filter((t) => t.status === "completed").length})
        </button>
      </div>

      {filteredTasks.map((task) => (
        <div
          key={task.id}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className={cn("flex items-center gap-3 min-w-0 flex-1 mr-4")}>
              <div
                className={cn(
                  "p-2 bg-pink-100 dark:bg-pink-900/20 rounded-lg text-pink-500 dark:text-pink-400 shrink-0"
                )}
              >
                {getFileIcon(task.filename)}
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className="font-medium text-sm truncate"
                  title={task.filename}
                >
                  {task.filename}
                </h3>
                <p
                  className="text-xs text-neutral-500 dark:text-neutral-400 truncate"
                  title={task.url}
                >
                  {task.url}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {task.status === "downloading" && (
                <button
                  onClick={() =>
                    setLimitModal({
                      isOpen: true,
                      taskId: task.id,
                      currentLimit: task.speed_limit || 0,
                    })
                  }
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-600 dark:text-neutral-400"
                  title="Set Speed Limit"
                >
                  <Gauge size={18} />
                </button>
              )}
              {task.status === "downloading" ? (
                <button
                  onClick={() => pauseDownload(task.id)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-600 dark:text-neutral-400"
                >
                  <Pause size={18} />
                </button>
              ) : task.status !== "completed" ? (
                <button
                  onClick={() => resumeDownload(task.id)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-600 dark:text-neutral-400"
                >
                  <Play size={18} />
                </button>
              ) : null}

              <button
                onClick={() =>
                  setDeleteModal({
                    isOpen: true,
                    taskId: task.id,
                    filename: task.filename,
                    isCompleted: task.status === "completed",
                  })
                }
                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-red-600 dark:text-red-400"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <span>
                {formatBytes(task.downloaded_size)} of{" "}
                {task.total_size > 0 ? formatBytes(task.total_size) : "Unknown"}
              </span>
              <span>
                {task.status === "extracting"
                  ? "Extracting..."
                  : `${formatBytes(task.speed)}/s`}
              </span>
            </div>
            <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  task.status === "error" ? "bg-red-500" : "bg-pink-500",
                  (task.total_size === 0 && task.status === "downloading") ||
                    task.status === "extracting"
                    ? "animate-pulse w-full bg-pink-400/50"
                    : ""
                )}
                style={{
                  width:
                    task.total_size > 0 && task.status !== "extracting"
                      ? `${task.progress}%`
                      : "100%",
                }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span
                className={cn(
                  "capitalize font-medium flex items-center gap-1",
                  task.status === "downloading"
                    ? "text-pink-600"
                    : task.status === "completed"
                    ? "text-green-600"
                    : task.status === "error"
                    ? "text-red-600"
                    : task.status === "extracting"
                    ? "text-amber-600"
                    : "text-neutral-500"
                )}
              >
                {task.status === "extracting" && (
                  <Loader2 size={12} className="animate-spin" />
                )}
                {task.status}
              </span>
              <div className="flex gap-2 mt-1">
                {task.auto_extract && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium border",
                      task.status === "completed"
                        ? task.extraction_skipped
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                          : "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                        : "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800"
                    )}
                  >
                    {task.status === "completed"
                      ? task.extraction_skipped
                        ? "Extraction Skipped"
                        : "Auto Extracted"
                      : "Auto Extract On"}
                  </span>
                )}
                {(task.status === "downloading" ||
                  task.status === "paused") && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium border",
                      task.supports_resume
                        ? "bg-green-100 text-green-600 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
                        : "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                    )}
                  >
                    {task.supports_resume ? "Resumable" : "Non-Resumable"}
                  </span>
                )}
              </div>
            </div>
            {task.status === "error" && task.error_message && (
              <details className="mt-2 text-xs text-red-600 dark:text-red-400">
                <summary className="cursor-pointer hover:underline font-medium">
                  Show Error Log
                </summary>
                <pre className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-800 overflow-x-auto whitespace-pre-wrap">
                  {task.error_message}
                </pre>
              </details>
            )}
          </div>
        </div>
      ))}
      {filteredTasks.length === 0 && (
        <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
          {activeTab === "active"
            ? "No active downloads."
            : "No completed downloads."}
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        filename={deleteModal.filename}
        isCompleted={deleteModal.isCompleted}
        onConfirm={async (deleteFile) => {
          await cancelDownload(deleteModal.taskId, deleteFile);
          setDeleteModal({ ...deleteModal, isOpen: false });
        }}
      />

      {/* Simple Speed Limit Modal */}
      {limitModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-2xl shadow-xl p-4">
            <h3 className="font-semibold mb-4">Set Speed Limit</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Limit:{" "}
                <span className="text-pink-600 dark:text-pink-400 font-bold">
                  {limitModal.currentLimit === 0
                    ? "Unlimited"
                    : limitModal.currentLimit < 1024
                    ? `${limitModal.currentLimit} KB/s`
                    : `${(limitModal.currentLimit / 1024).toFixed(1)} MB/s`}
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer dark:bg-neutral-700 accent-pink-600"
                value={speedToSlider(limitModal.currentLimit)}
                onChange={(e) =>
                  setLimitModal({
                    ...limitModal,
                    currentLimit: sliderToSpeed(parseInt(e.target.value)),
                  })
                }
              />
              <div className="relative w-full h-4 mt-1 text-xs text-neutral-500">
                <span className="absolute left-0">Unlimited</span>
                <span className="absolute left-[30%] -translate-x-1/2">
                  1 MB/s
                </span>
                <span className="absolute right-0">50 MB/s</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setLimitModal({ ...limitModal, isOpen: false })}
                className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await setSpeedLimit(
                    limitModal.taskId,
                    limitModal.currentLimit
                  );
                  setLimitModal({ ...limitModal, isOpen: false });
                }}
                className="px-4 py-2 text-sm bg-pink-600 text-white rounded-lg hover:bg-pink-700"
              >
                Set Limit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
