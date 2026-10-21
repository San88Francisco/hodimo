import { z } from "zod";

import { env } from "@/lib/env";
import { forbidden, handler } from "@/lib/http";
import { sendWelcome } from "@/lib/welcome";

const Update = z.object({
  message: z
    .object({
      text: z.string().optional(),
      chat: z.object({ id: z.number(), type: z.string() }),
      from: z.object({ id: z.number(), first_name: z.string(), language_code: z.string().optional() }).optional(),
    })
    .optional(),
});

/**
 * Оновлення від Telegram (setWebhook з secret_token, див. `npm run tg:webhook`).
 * Поки що бот лише вітається на /start. Завжди відповідаємо 200: інакше Telegram повторюватиме оновлення.
 */
export const POST = handler(async (request: Request) => {
  const secret = env().TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) throw forbidden();

  const message = Update.safeParse(await request.json().catch(() => null)).data?.message;
  if (message?.from && message.chat.type === "private" && /^\/start(\s|$)/.test(message.text ?? "")) {
    try {
      await sendWelcome(message.chat.id, message.from);
    } catch (error) {
      console.error(`bot: не вдалося привітати ${message.from.id}`, error);
    }
  }
  return Response.json({ ok: true });
});
