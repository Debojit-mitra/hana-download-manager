import Head from "next/head";
import { useState, useEffect } from "react";
import { Settings, fetchSettings, updateSettings } from "@/contexts/api";
import { Save, Folder, Github, Info, Heart, Cloud } from "lucide-react";
import { DriveAuth } from "@/components/DriveAuth";

// Import package.json version dynamically
const pkg = require("../../package.json");

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    download_dir: "downloads",
    max_concurrent_downloads: 3,
    max_connections_per_task: 4,
    organize_files: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // ensure no NaN/null values are sent
      const validSettings = {
        ...settings,
        max_concurrent_downloads: settings.max_concurrent_downloads || 3,
        max_connections_per_task: settings.max_connections_per_task || 4,
      };
      await updateSettings(validSettings);
      // Update local state with values if they were invalid
      setSettings(validSettings);
      alert("Settings saved!");
    } catch (e) {
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <>
      <Head>
        <title>Settings - Hana Download Manager</title>
      </Head>

      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Folder size={20} />
              General
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">
                  Download Directory
                </label>
                <input
                  type="text"
                  value={settings.download_dir}
                  onChange={(e) =>
                    setSettings({ ...settings, download_dir: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Provide absolute path
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="organize"
                  checked={settings.organize_files}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      organize_files: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-neutral-300 text-pink-600 focus:ring-pink-500 accent-pink-500 dark:accent-pink-600"
                />
                <label
                  htmlFor="organize"
                  className="text-sm text-neutral-700 dark:text-neutral-200 select-none cursor-pointer"
                >
                  Auto-organize files by type (Music, Video, etc.)
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Performance</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">
                  Max Concurrent Downloads
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={
                    isNaN(settings.max_concurrent_downloads)
                      ? ""
                      : settings.max_concurrent_downloads
                  }
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_concurrent_downloads: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">
                  Max Connections per Task
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={
                    isNaN(settings.max_connections_per_task)
                      ? ""
                      : settings.max_connections_per_task
                  }
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_connections_per_task: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Cloud size={20} />
              Integrations
            </h2>
            <div className="flex flex-col justify-between gap-2">
              <div>
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                  Google Drive
                </h3>
                <p className="text-sm text-neutral-500">
                  Connect your Google Drive account to download files directly.
                </p>
              </div>
              <DriveAuth />
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Info size={20} />
              About
            </h2>
            <div>
              <a
                href="https://github.com/Debojit-mitra/hana-download-manager"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-semibold text-pink-500 dark:text-pink-600 hover:underline"
              >
                <Github size={16} />
                Visit on GitHub
              </a>
            </div>
            <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400 mt-2">
              <p className="space-x-1">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Hana Download Manager
                </span>
                <span className="text-xs">v{pkg.version}</span>
              </p>
              <p>
                A professional, high-performance download manager built with
                Next.js and Python.
              </p>
            </div>
            <div className="flex items-center mt-4 gap-1.5 text-base font-semibold text-neutral-500 justify-center">
              Made with
              <Heart size={14} className="fill-red-500/20 text-red-500" /> in
              India
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-pink-500 dark:bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
