import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Lets phones on the local network load dev assets and HMR (192.168.x.x).
  allowedDevOrigins: ["192.168.*.*"],
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
