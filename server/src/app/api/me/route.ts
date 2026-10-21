import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/db";
import { requireActiveUser, requireUser, toUserDto } from "@/lib/auth";
import { handler, readJson } from "@/lib/http";

/** Перевіряє initData, створює/оновлює користувача й повертає профіль із роллю. */
export const GET = handler(async (request: Request) => {
  return Response.json(toUserDto(await requireUser(request)));
});

const MePatchSchema = z
  .object({
    /**
     * Людина щойно дозволила боту писати (requestWriteAccess). Довіряємо клієнту: якщо ні —
     * перше ж повідомлення отримає 403, і доступ скинеться.
     */
    botAccess: z.literal(true),
    notifyNewMeetups: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Немає полів для оновлення");

/** Налаштування сповіщень. */
export const PATCH = handler(async (request: Request) => {
  const user = await requireActiveUser(request);
  const patch = await readJson(request, MePatchSchema);
  const [row] = await db()
    .update(schema.users)
    .set(patch)
    .where(eq(schema.users.id, user.id))
    .returning();
  return Response.json(toUserDto(row!));
});
