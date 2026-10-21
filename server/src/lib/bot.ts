import { env } from "@/lib/env";

/** Мінімальний клієнт Telegram Bot API: лише те, чим бот розсилає сповіщення. */

export type InlineButton = { text: string; web_app: { url: string } };

type BotResponse<T> =
  | { ok: true; result: T }
  | { ok: false; error_code: number; description: string; parameters?: { retry_after?: number } };

export class BotError extends Error {
  constructor(
    readonly code: number,
    description: string,
  ) {
    super(description);
  }

  /** Людина заблокувала бота або ніколи не дозволяла йому писати. */
  get isUnreachable() {
    return this.code === 403 || (this.code === 400 && /chat not found/i.test(this.message));
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function call<T>(method: string, params: Record<string, unknown>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(`https://api.telegram.org/bot${env().TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json()) as BotResponse<T>;
    if (body.ok) return body.result;
    // 429: Telegram каже, скільки почекати. Пробуємо ще раз, але не нескінченно.
    const retryAfter = body.parameters?.retry_after;
    if (body.error_code === 429 && retryAfter && attempt < 2) {
      await sleep(retryAfter * 1000);
      continue;
    }
    throw new BotError(body.error_code, body.description);
  }
}

type Message = { photo?: { file_id: string }[] };

export type Post = {
  /** HTML-розмітка Telegram. */
  text: string;
  /** URL картинки або file_id з попереднього надсилання. */
  photo?: string | null;
  button: InlineButton;
};

/**
 * Повідомлення з картинкою (якщо є) і кнопкою. Повертає file_id картинки, щоб наступним
 * отримувачам Telegram не завантажував її знову. Картинку не прийняли — шлемо без неї.
 */
export async function sendPost(chatId: number, post: Post): Promise<string | null> {
  const common = {
    chat_id: chatId,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [[post.button]] },
  };
  if (post.photo) {
    try {
      const message = await call<Message>("sendPhoto", { ...common, photo: post.photo, caption: post.text });
      return message.photo?.at(-1)?.file_id ?? null;
    } catch (error) {
      if (!(error instanceof BotError) || error.code !== 400 || error.isUnreachable) throw error;
      console.warn(`bot: картинку ${post.photo} не прийнято (${error.message}), шлемо текстом`);
    }
  }
  await call("sendMessage", { ...common, text: post.text, link_preview_options: { is_disabled: true } });
  return null;
}

/** Екранування для parse_mode HTML. */
export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Ліміт Telegram — ~30 повідомлень на секунду різним людям; тримаємось нижче. */
export const SEND_INTERVAL_MS = 50;
export { sleep };
