import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,

  async rewrites() {
    // Backend URL - defaults to localhost:8000 in dev
    // In production, set BACKEND_URL env var (e.g., http://localhost:8000 or internal service URL)
    // const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
