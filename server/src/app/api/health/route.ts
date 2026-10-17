import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/db";

/**
 * Пінг бази. Vercel Cron смикає його щодня (див. vercel.json),
 * щоб Supabase не ставив проєкт на паузу; Docker використовує як healthcheck.
 */
export async function GET() {
  await connection();
  try {
    await db().execute(sql`select 1`);
    return Response.json({ ok: true, db: "up", time: new Date().toISOString() });
  } catch (error) {
    console.error("health: база недоступна", error);
    return Response.json({ ok: false, db: "down" }, { status: 503 });
  }
}
