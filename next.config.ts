import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose"],
  experimental: {
    serverActions: { bodySizeLimit: "100mb" },
  },
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
