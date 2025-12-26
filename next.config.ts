import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable server actions
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // For file uploads
    },
  },
};

export default nextConfig;
