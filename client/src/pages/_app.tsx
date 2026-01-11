import type { AppProps } from "next/app";
import { ThemeProvider } from "@/components/theme-provider";
import { DownloadProvider } from "@/contexts/download-context";
import Navbar from "@/components/Navbar";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <DownloadProvider>
        <Navbar />
        <Component {...pageProps} />
      </DownloadProvider>
    </ThemeProvider>
  );
}
