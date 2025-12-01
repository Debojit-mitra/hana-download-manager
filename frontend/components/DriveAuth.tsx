"use client";

import { useEffect, useState } from "react";
import {
  getDriveStatus,
  initiateDriveAuth,
  uploadDriveCredentials,
} from "@/lib/api";
import { Loader2, CheckCircle2, RefreshCw, Upload } from "lucide-react";
import Image from "next/image";
import { Snackbar, SnackbarType } from "./Snackbar";

export function DriveAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    isOpen: boolean;
    message: string;
    type: SnackbarType;
  }>({
    isOpen: false,
    message: "",
    type: "info",
  });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const status = await getDriveStatus();
      setIsAuthenticated(status.is_authenticated);
      setHasCredentials(status.has_credentials);
    } catch (error) {
      console.error("Failed to check drive status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadDriveCredentials(file);
      setSnackbar({
        isOpen: true,
        message: "Credentials uploaded! Please connect Google Drive.",
        type: "success",
      });
      // Force re-check status (should be false now)
      checkStatus();
    } catch (error) {
      console.error("Failed to upload credentials:", error);
      setSnackbar({
        isOpen: true,
        message: "Failed to upload credentials.",
        type: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAuth = async () => {
    setAuthLoading(true);
    try {
      await initiateDriveAuth();
      // Poll for status change or just wait a bit and check
      // Since the auth flow opens a browser window (backend logic),
      // we might need to wait for the user to complete it.
      // For now, let's just re-check status after a delay or let user click "Check Again"

      // In a real web app, we'd redirect. Here we just trigger the backend flow.
      // We can poll for a bit.
      let attempts = 0;
      const interval = setInterval(async () => {
        const status = await getDriveStatus();
        if (status.is_authenticated) {
          setIsAuthenticated(true);
          setAuthLoading(false);
          clearInterval(interval);
        }
        attempts++;
        if (attempts > 60) {
          // Stop polling after 60 seconds
          clearInterval(interval);
          setAuthLoading(false);
        }
      }, 1000);
    } catch (error) {
      console.error("Failed to initiate auth:", error);
      setAuthLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <CheckCircle2 className="w-4 h-4" />
          <span>Drive Connected</span>
        </div>
        <button
          onClick={handleAuth}
          disabled={authLoading}
          className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 underline flex items-center gap-1"
        >
          {authLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          Reauthorize
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleAuth}
        disabled={authLoading}
        className="flex items-center gap-2 w-fit px-4 py-2 text-sm hover:text-white font-medium border border-neutral-200 dark:border-neutral-800 hover:bg-pink-500 dark:hover:bg-pink-600 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
      >
        {authLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Image
            src="/icons/drive.webp"
            alt="Google Drive"
            width={20}
            height={20}
          />
        )}
        {authLoading ? "Connecting..." : "Connect Google Drive"}
      </button>

      <div className="relative">
        <input
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading || authLoading}
          title="Upload credentials.json"
        />
        <button
          disabled={uploading || authLoading}
          className="flex items-center gap-2 w-fit px-4 py-2 text-sm hover:text-white font-medium border border-neutral-200 dark:border-neutral-800 hover:bg-pink-500 dark:hover:bg-pink-600 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {hasCredentials ? "Re-upload Credentials" : "Upload Credentials"}
        </button>
      </div>
      <Snackbar
        isOpen={snackbar.isOpen}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
