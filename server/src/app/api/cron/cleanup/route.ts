import { connection } from "next/server";

import { env } from "@/lib/env";
import { forbidden, handler } from "@/lib/http";
import { deleteExpiredMeetups, PAST_RETENTION_DAYS } from "@/lib/meetups";

/**
 * Щоденне прибирання (Vercel Cron, див. vercel.json): видаляє події, що пройшли
 * понад PAST_RETENTION_DAYS днів тому. Захищено CRON_SECRET; локально без нього можна смикнути вручну.
 */
export const GET = handler(async (request: Request) => {
  await connection();
  const { CRON_SECRET } = env();
  const authorized = CRON_SECRET
    ? request.headers.get("authorization") === `Bearer ${CRON_SECRET}`
    : process.env.NODE_ENV !== "production";
  if (!authorized) throw forbidden("Лише для cron");

  const deleted = await deleteExpiredMeetups();
  console.log(`cron/cleanup: видалено ${deleted} подій, старших за ${PAST_RETENTION_DAYS} днів`);
  return Response.json({ ok: true, deleted, retentionDays: PAST_RETENTION_DAYS });
});
