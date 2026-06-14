import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  turbopack: {
    root: appRoot,
  },
  outputFileTracingRoot: appRoot,
};

export default nextConfig;
