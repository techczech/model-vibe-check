import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  // Enable server actions
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // For file uploads
    },
  },
};

export default nextConfig;
