import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    globalNotFound: true,
    serverActions: {
      // Up to 5 images at 5MB each, plus multipart overhead.
      bodySizeLimit: "40mb",
    },
  },
};

export default nextConfig;
