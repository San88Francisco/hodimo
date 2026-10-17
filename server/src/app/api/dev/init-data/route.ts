import { z } from "zod";

import { db, schema } from "@/db";
import { USER_ROLES } from "@/db/schema";
import { env } from "@/lib/env";
import { handler, notFound, readJson } from "@/lib/http";
import { signInitData } from "@/lib/telegram";

const BodySchema = z.object({
  telegramId: z.number().int().positive(),
  firstName: z.string().trim().min(1).max(64),
  username: z.string().trim().max(32).optional(),
  /** Якщо задано — тестовий користувач одразу отримує цю роль і статус. */
  role: z.enum(USER_ROLES).optional(),
  isBlocked: z.boolean().optional(),
});

/**
 * Лише для локальної розробки (DEV_LOGIN=true): видає initData, підписані токеном бота,
 * щоб зайти під будь-ким без Telegram, і за потреби виставляє роль чи блокування.
 * На проді змінна не задана — маршрут віддає 404.
 */
export const POST = handler(async (request: Request) => {
  const config = env();
  if (!config.DEV_LOGIN) throw notFound();

  const body = await readJson(request, BodySchema);

  if (body.role !== undefined || body.isBlocked !== undefined) {
    const state = {
      ...(body.role !== undefined && { role: body.role }),
      ...(body.isBlocked !== undefined && { isBlocked: body.isBlocked }),
    };
    await db()
      .insert(schema.users)
      .values({
        telegramId: body.telegramId,
        firstName: body.firstName,
        username: body.username ?? null,
        ...state,
      })
      .onConflictDoUpdate({ target: schema.users.telegramId, set: state });
  }

  const initData = signInitData(
    { id: body.telegramId, first_name: body.firstName, username: body.username },
    config.TELEGRAM_BOT_TOKEN,
  );
  return Response.json({ initData });
});
