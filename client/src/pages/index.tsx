import Head from "next/head";
import DownloadList from "@/components/DownloadList";
import AddDownloadModal from "@/components/AddDownloadModal";
import ClipboardMonitor from "@/components/ClipboardMonitor";

export default function Home() {
  return (
    <>
      <Head>
        <title>Hana Download Manager</title>
        <meta
          name="description"
          content="A professional, fast, and elegant download manager."
        />
      </Head>

      <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-neutral-100 font-sans">
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Manage</h2>
            <p className="text-neutral-500 dark:text-neutral-400">
              Your active and completed downloads.
            </p>
          </div>

          <DownloadList />
        </main>

        <AddDownloadModal />
        <ClipboardMonitor />
      </div>
    </>
  );
}
