import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hana Download Manager",
  description: "Professional Download Manager",
};

import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/Header";
import { DownloadProvider } from "@/lib/download-context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DownloadProvider>
            <Header />
            {children}
          </DownloadProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
