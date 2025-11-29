"use client";

import { useEffect } from "react";
import { addDownload } from "@/lib/api";

export default function ClipboardMonitor() {
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        if (!document.hasFocus()) return;

        const text = await navigator.clipboard.readText();
        if (
          text &&
          (text.startsWith("http://") || text.startsWith("https://"))
        ) {
          // Simple check to avoid spamming: store last checked url in session storage
          const lastChecked = sessionStorage.getItem("lastCheckedUrl");
          if (text !== lastChecked) {
            sessionStorage.setItem("lastCheckedUrl", text);
            if (
              confirm(
                `Detected URL in clipboard:\n${text}\n\nDo you want to download it?`
              )
            ) {
              await addDownload(text);
            }
          }
        }
      } catch (e) {
        // Clipboard access denied or empty
      }
    };

    // Check on window focus
    window.addEventListener("focus", checkClipboard);
    return () => window.removeEventListener("focus", checkClipboard);
  }, []);

  return null; // Invisible component
}
