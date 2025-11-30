"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteFile: boolean) => void;
  filename: string;
  isCompleted: boolean;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  filename,
  isCompleted,
}: ConfirmDeleteModalProps) {
  const [deleteFile, setDeleteFile] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
          <h2 className="font-semibold text-lg">Remove Download</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-neutral-600 dark:text-neutral-300">
            Are you sure you want to remove{" "}
            <span className="font-medium text-neutral-900 dark:text-neutral-100 break-all">
              {filename}
            </span>
            ?
          </p>

          {isCompleted ? (
            <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <input
                type="checkbox"
                id="deleteFile"
                checked={deleteFile}
                onChange={(e) => setDeleteFile(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-pink-600 focus:ring-pink-500 accent-pink-500 dark:accent-pink-600"
              />
              <label
                htmlFor="deleteFile"
                className="text-sm text-neutral-700 dark:text-neutral-200 select-none cursor-pointer"
              >
                Also delete file from disk
              </label>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm rounded-lg">
              Incomplete download. Files will be deleted from disk.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(deleteFile)}
              className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
            >
              <Trash2 size={16} />
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
