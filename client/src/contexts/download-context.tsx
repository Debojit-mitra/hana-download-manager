"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { DownloadTask, fetchDownloads } from "@/contexts/api";

interface DownloadContextType {
  tasks: DownloadTask[];
  refreshTasks: () => Promise<void>;
}

const DownloadContext = createContext<DownloadContextType | undefined>(
  undefined
);

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);

  const refreshTasks = async () => {
    try {
      const data = await fetchDownloads();
      setTasks(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Check if there are any active tasks
  const hasActive = tasks.some((t) =>
    ["downloading", "extracting", "queued", "pending"].includes(t.status)
  );

  useEffect(() => {
    // Poll frequently (1s) if active, otherwise slowly (5s)
    const delay = hasActive ? 1000 : 5000;

    const interval = setInterval(refreshTasks, delay);
    return () => clearInterval(interval);
  }, [hasActive]); // Only reset timer when activity state changes

  // Initial fetch on mount
  useEffect(() => {
    refreshTasks();
  }, []);

  return (
    <DownloadContext.Provider value={{ tasks, refreshTasks }}>
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownloads() {
  const context = useContext(DownloadContext);
  if (context === undefined) {
    throw new Error("useDownloads must be used within a DownloadProvider");
  }
  return context;
}
