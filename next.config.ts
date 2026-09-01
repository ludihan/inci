import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    serverActions: {
      // Up to 5 images (50MB) + 2 videos (500MB) can be attached to a single
      // submission, so the limit must cover that worst case plus multipart overhead.
      bodySizeLimit: "1300mb",
    },
  },
};

export default nextConfig;
