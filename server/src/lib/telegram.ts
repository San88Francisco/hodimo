import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const TelegramUserSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
});

export type TelegramUser = z.infer<typeof TelegramUserSchema>;

export type InitDataResult =
  | { ok: true; user: TelegramUser }
  | { ok: false; reason: string };

function secretKey(botToken: string) {
  return createHmac("sha256", "WebAppData").update(botToken).digest();
}

/** Рядок для підпису: усі поля, крім hash, відсортовані за ключем, через \n. */
function dataCheckString(params: URLSearchParams) {
  return [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

/**
 * Перевіряє initData з Telegram Mini App за алгоритмом
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number,
): InitDataResult {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) {
    return { ok: false, reason: "hash відсутній або некоректний" };
  }

  const expected = createHmac("sha256", secretKey(botToken))
    .update(dataCheckString(params))
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(hash, "hex"))) {
    return { ok: false, reason: "Невірний підпис initData" };
  }

  const authDate = Number(params.get("auth_date"));
  if (!Number.isInteger(authDate) || authDate <= 0) return { ok: false, reason: "auth_date відсутній" };
  if (Date.now() / 1000 - authDate > maxAgeSeconds) return { ok: false, reason: "initData прострочені" };

  let userJson: unknown;
  try {
    userJson = JSON.parse(params.get("user") ?? "");
  } catch {
    return { ok: false, reason: "У initData немає користувача" };
  }
  const user = TelegramUserSchema.safeParse(userJson);
  if (!user.success) return { ok: false, reason: "Некоректне поле user" };

  return { ok: true, user: user.data };
}

/** Підписує initData так само, як Telegram. Лише для локальної розробки. */
export function signInitData(user: TelegramUser, botToken: string): string {
  const params = new URLSearchParams({
    query_id: `local-${Date.now()}`,
    user: JSON.stringify(user),
    auth_date: String(Math.floor(Date.now() / 1000)),
  });
  const hash = createHmac("sha256", secretKey(botToken))
    .update(dataCheckString(params))
    .digest("hex");
  params.set("hash", hash);
  return params.toString();
}
