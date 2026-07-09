import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root so multiple ancestor lockfiles don't confuse Turbopack.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
