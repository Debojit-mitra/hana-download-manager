import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className="antialiased bg-neutral-50 dark:bg-black">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
