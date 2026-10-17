import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Мінімальний server.js + лише потрібні node_modules — для Docker-образу.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
