import Head from "next/head";
import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 - Page Not Found</title>
      </Head>

      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <div className="bg-pink-50 dark:bg-pink-900/20 p-6 rounded-full mb-6">
          <FileQuestion className="w-16 h-16 text-pink-500 dark:text-pink-400" />
        </div>
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-2">
          Page Not Found
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-md mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-pink-500/20"
        >
          <Home size={20} />
          Go Back Home
        </Link>
      </div>
    </>
  );
}
