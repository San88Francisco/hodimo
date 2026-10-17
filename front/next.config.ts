import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * HTTPS-тунелі для локального тесту в справжньому Telegram
 * (`cloudflared tunnel --url http://localhost:3000` або ngrok).
 */
const TUNNEL_HOSTS = ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok.app"];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  // Dev-сервер за замовчуванням відкидає запити з чужих доменів.
  allowedDevOrigins: TUNNEL_HOSTS,
  // Server Actions звіряють Origin із хостом; тунелі дозволяємо лише в dev, щоб не відкривати CSRF на проді.
  ...(isDev && { experimental: { serverActions: { allowedOrigins: TUNNEL_HOSTS } } }),
};

export default nextConfig;
