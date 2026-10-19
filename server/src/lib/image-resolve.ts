import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { badRequest } from "@/lib/http";

/**
 * Перетворює будь-яке посилання на пряму адресу картинки:
 * - пряме посилання на зображення → як є (після редиректів);
 * - Google Картинки (`imgres?imgurl=`) → оригінал;
 * - сторінка (Pinterest, Instagram, Unsplash, новини…) → її прев'ю для соцмереж (og:image / twitter:image);
 * - короткі посилання (pin.it, bit.ly…) розгортаються за редиректами.
 *
 * Сервер ходить лише на публічні адреси (захист від SSRF), з таймаутом і обмеженням розміру.
 */

const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 5;
const MAX_HTML_BYTES = 1_500_000;

/** Деякі сайти (зокрема Pinterest) віддають прев'ю саме «краулерам соцмереж». */
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
];

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number) as [number, number];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  return (
    v6 === "::1" ||
    v6 === "::" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe80") ||
    (v6.startsWith("::ffff:") && isPrivateIp(v6.slice(7)))
  );
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw badRequest("Це не схоже на посилання");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw badRequest("Потрібне посилання http(s)");
  if (url.username || url.password) throw badRequest("Посилання з логіном не підтримуються");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (addresses.length === 0) throw badRequest("Не вдалося знайти цей сайт");
  if (addresses.some(isPrivateIp)) throw badRequest("Це посилання недоступне");
  return url;
}

/** google.com/imgres?imgurl=… (у т.ч. після редиректу з share.google) → адреса картинки. */
function googleImgurl(url: URL) {
  if (!/(^|\.)google\./.test(url.hostname)) return null;
  const target = url.searchParams.get("imgurl");
  return target && /^https?:\/\//.test(target) ? target : null;
}

/** GET з ручними редиректами: кожен крок перевіряємо, що адреса публічна. */
async function fetchFollowing(start: URL, userAgent: string) {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const imgurl = googleImgurl(url);
    if (imgurl) url = await assertPublicUrl(imgurl);
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent": userAgent,
        accept: "text/html,application/xhtml+xml,image/avif,image/webp,image/*;q=0.9,*/*;q=0.8",
        "accept-language": "uk,en;q=0.8",
      },
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel();
      url = await assertPublicUrl(new URL(location, url).toString());
      continue;
    }
    return { response, url };
  }
  throw badRequest("Забагато переадресацій");
}

async function readLimited(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks));
}

const decodeEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

/** og:image / twitter:image / link rel=image_src — у будь-якому порядку атрибутів. */
function findPreviewImage(html: string): string | null {
  const keys = ["og:image:secure_url", "og:image:url", "og:image", "twitter:image", "twitter:image:src"];
  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const key of keys) {
    for (const tag of metas) {
      const name = tag.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
      if (name !== key) continue;
      const content = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
      if (content) return decodeEntities(content.trim());
    }
  }
  const link = html.match(/<link\b[^>]*rel\s*=\s*["']image_src["'][^>]*>/i)?.[0];
  const href = link?.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
  return href ? decodeEntities(href.trim()) : null;
}

export async function resolveImageUrl(input: string): Promise<{ imageUrl: string; source: "direct" | "page" }> {
  let url = await assertPublicUrl(input);

  // Google Картинки: справжня адреса — у параметрі imgurl.
  const imgurl = googleImgurl(url);
  if (imgurl) url = await assertPublicUrl(imgurl);

  let lastError: unknown;
  for (const userAgent of USER_AGENTS) {
    try {
      const { response, url: finalUrl } = await fetchFollowing(url, userAgent);
      const type = response.headers.get("content-type") ?? "";

      if (type.startsWith("image/") || (response.ok && IMAGE_EXT.test(finalUrl.pathname) && !type.includes("html"))) {
        await response.body?.cancel();
        return { imageUrl: finalUrl.toString(), source: "direct" };
      }
      if (!response.ok) {
        await response.body?.cancel();
        lastError = badRequest(`Сайт відповів помилкою ${response.status}`);
        continue;
      }
      if (type.includes("html")) {
        const preview = findPreviewImage(await readLimited(response));
        if (preview) {
          const absolute = await assertPublicUrl(new URL(preview, finalUrl).toString());
          return { imageUrl: absolute.toString(), source: "page" };
        }
      } else {
        await response.body?.cancel();
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error && lastError.name === "TimeoutError") {
    throw badRequest("Сайт не відповідає — спробуй інше посилання");
  }
  if (lastError && (lastError as { status?: number }).status === 400) throw lastError;
  throw badRequest("Не знайшли картинку за цим посиланням — спробуй скопіювати адресу самого зображення");
}
