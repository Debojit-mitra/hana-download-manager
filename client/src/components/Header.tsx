"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const pkg = require("../../package.json");

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          {mounted ? (
            <Image
              src={"/images/hdm.webp"}
              alt="Hana Logo"
              width={48}
              height={48}
              className="rounded-lg"
            />
          ) : (
            <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
          )}
          <h1 className="font-bold text-lg md:text-xl tracking-tight text-neutral-900 dark:text-neutral-100 -ml-1">
            Downloader
          </h1>
          <div className="text-[0.7rem] text-neutral-500 ml-2 mt-2">
            v{pkg.version}
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/settings"
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-400"
            title="Settings"
          >
            <Settings size={20} />
          </Link>
        </div>
      </div>
    </header>
  );
}
