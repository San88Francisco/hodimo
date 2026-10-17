import { z } from "zod";

import { env } from "@/lib/env";
import { handler, notFound, readJson } from "@/lib/http";
import { signInitData } from "@/lib/telegram";

const BodySchema = z.object({
  telegramId: z.number().int().positive(),
  firstName: z.string().trim().min(1).max(64),
  username: z.string().trim().max(32).optional(),
});

/**
 * Лише для локальної розробки (DEV_LOGIN=true): видає initData, підписані токеном бота,
 * щоб зайти під будь-ким без Telegram. На проді змінна не задана — маршрут віддає 404.
 */
export const POST = handler(async (request: Request) => {
  const config = env();
  if (!config.DEV_LOGIN) throw notFound();

  const body = await readJson(request, BodySchema);
  const initData = signInitData(
    { id: body.telegramId, first_name: body.firstName, username: body.username },
    config.TELEGRAM_BOT_TOKEN,
  );
  return Response.json({ initData });
});
