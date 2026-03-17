import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose", "pdf-parse", "pdf-to-img", "tesseract.js"],
  experimental: {
    serverActions: { bodySizeLimit: "100mb" },
  },
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
