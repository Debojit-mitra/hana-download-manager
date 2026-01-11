"use client";

import { useEffect, useState } from "react";
import {
  getDriveStatus,
  initiateDriveAuth,
  uploadDriveCredentials,
  verifyDriveAuth,
} from "@/contexts/api";
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

    // Check for auth code in URL (redirect flow)
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Auto-verify
      const redirectUri =
        process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI ||
        window.location.origin + window.location.pathname;
      verifyCode(code, redirectUri);
    }
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

  const verifyCode = async (code: string, redirectUri?: string) => {
    setAuthLoading(true);
    try {
      await verifyDriveAuth(code, redirectUri);
      setSnackbar({
        isOpen: true,
        message: "Google Drive connected successfully!",
        type: "success",
      });
      setAuthModal({ ...authModal, isOpen: false });
      checkStatus();
    } catch (error: any) {
      console.error("Failed to verify code:", error);
      setSnackbar({
        isOpen: true,
        message: error.message || "Failed to verify code.",
        type: "error",
      });
    } finally {
      setAuthLoading(false);
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

  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    url: string;
    code: string;
    redirectUri: string;
  }>({
    isOpen: false,
    url: "",
    code: "",
    redirectUri: "",
  });

  const handleAuth = async () => {
    setAuthLoading(true);
    try {
      // Use env var or current page as redirect URI
      const redirectUri =
        process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI ||
        window.location.origin + window.location.pathname;

      const { auth_url } = await initiateDriveAuth(redirectUri);

      if (auth_url) {
        setAuthModal({ isOpen: true, url: auth_url, code: "", redirectUri });
      } else {
        // Fallback or if already authenticated?
        checkStatus();
      }
    } catch (error) {
      console.error("Failed to initiate auth:", error);
      setSnackbar({
        isOpen: true,
        message: "Failed to initiate auth. Check logs.",
        type: "error",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!authModal.code) return;
    // Use the same redirect URI that was used to generate the link
    await verifyCode(authModal.code, authModal.redirectUri);
  };

  if (loading) {
    return null;
  }

  return (
    <>
      {isAuthenticated ? (
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
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={handleAuth}
            disabled={authLoading || !hasCredentials}
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
        </div>
      )}

      {/* Auth Modal */}
      {authModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Connect Google Drive</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              1. Click the link below to authorize the app.
              <br />
              2. <strong>If you are not redirected automatically</strong> (or
              see an error page):
              <br />
              3. Copy the <strong>full URL</strong> from the address bar.
              <br />
              4. Paste it below.
            </p>

            <a
              href={authModal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-4 py-2 mb-4 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:underline text-sm break-all"
            >
              Click here to authorize
            </a>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Verification Code (or paste full URL)
              </label>
              <input
                type="text"
                value={authModal.code}
                onChange={(e) => {
                  const val = e.target.value;
                  // Smart extract: look for code=...
                  const match = val.match(/[?&]code=([^&]+)/);
                  if (match) {
                    setAuthModal({
                      ...authModal,
                      code: decodeURIComponent(match[1]),
                    });
                  } else {
                    setAuthModal({ ...authModal, code: val });
                  }
                }}
                placeholder="Paste code or full URL here..."
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg border-none focus:ring-2 focus:ring-pink-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAuthModal({ ...authModal, isOpen: false })}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={!authModal.code || authLoading}
                className="px-4 py-2 text-sm bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authLoading ? "Verifying..." : "Verify & Connect"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Snackbar
        isOpen={snackbar.isOpen}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
