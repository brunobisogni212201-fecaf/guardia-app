import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
