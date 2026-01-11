import type { AppProps } from "next/app";
import { ThemeProvider } from "@/components/theme-provider";
import { DownloadProvider } from "@/contexts/download-context";
import Header from "@/components/Header";
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
        <Header />
        <Component {...pageProps} />
      </DownloadProvider>
    </ThemeProvider>
  );
}
