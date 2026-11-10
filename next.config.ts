import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.SPECTRA_BUILD_DIR || ".next",
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: { cpus: 2 },
  turbopack: { root: process.cwd() },
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/upload": [
      "./workers/pdf.mjs",
      "./node_modules/pdfjs-dist/legacy/build/**/*",
    ],
  },
};
export default config;
