/**
 * Сесія = сирі initData з Telegram у httpOnly-cookie.
 * Сервер фронту пересилає їх у API як `Authorization: tma <initData>`, а API перевіряє підпис.
 */
export const SESSION_COOKIE = "tma";

/**
 * initData містять percent-encoded JSON, а Next перекодовує значення cookie —
 * кирилиця в імені поверталась би «сирою» і ламала заголовок Authorization.
 * base64url ці перетворення не зачіпають.
 */
export function encodeSession(initData: string) {
  return Buffer.from(initData, "utf8").toString("base64url");
}

export function decodeSession(value: string | undefined) {
  return value ? Buffer.from(value, "base64url").toString("utf8") : undefined;
}

/**
 * Telegram Web відкриває Mini App в iframe — там cookie живе лише з SameSite=None; Secure.
 * Це потрібно на проді й через HTTPS-тунель; на звичайному http://localhost лишаємо Lax.
 */
export function sessionCookieOptions(isHttps: boolean) {
  const crossSite = process.env.NODE_ENV === "production" || isHttps;
  return {
    httpOnly: true,
    path: "/",
    secure: crossSite,
    sameSite: crossSite ? ("none" as const) : ("lax" as const),
    // initData живуть на API добу; Telegram видає нові при кожному відкритті.
    maxAge: 60 * 60 * 24,
  };
}
