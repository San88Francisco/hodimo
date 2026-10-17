import { NextResponse, type NextRequest } from "next/server";

function allowedOrigins() {
  return (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

/** CORS для фронту, який живе на іншому origin (Mini App на Vercel або localhost:3000). */
export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = origin && allowedOrigins().includes(origin) ? corsHeaders(origin) : {};

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
