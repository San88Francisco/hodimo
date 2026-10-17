import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Мінімальний server.js + лише потрібні node_modules — тільки для Docker-образу
  // (Dockerfile ставить NEXT_STANDALONE=1). На Vercel standalone конфліктує з його
  // адаптером збірки, тож там лишається звичайний output.
  output: process.env.NEXT_STANDALONE === "1" ? "standalone" : undefined,
  poweredByHeader: false,
};

export default nextConfig;
