import { connection } from "next/server";

import { env } from "@/lib/env";
import { forbidden, handler } from "@/lib/http";
import { sendReminders } from "@/lib/notifications";

/** Розсилка може тривати кілька хвилин, якщо учасників багато. */
export const maxDuration = 300;

/**
 * Нагадування «завтра» учасникам. Смикає Vercel Cron раз на день (див. vercel.json)
 * із заголовком `Authorization: Bearer <CRON_SECRET>`.
 */
export const GET = handler(async (request: Request) => {
  await connection();
  const secret = env().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) throw forbidden();
  return Response.json(await sendReminders());
});
