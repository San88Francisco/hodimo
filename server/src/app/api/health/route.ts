import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/db";

/** Код помилки Postgres/мережі (28P01, ENOTFOUND, …). Drizzle кладе оригінал у cause. */
function errorCode(error: unknown): string {
  const err = error as { code?: string; cause?: { code?: string } } | undefined;
  return err?.cause?.code ?? err?.code ?? "unknown";
}

/**
 * Пінг бази. Vercel Cron смикає його щодня (див. vercel.json),
 * щоб Supabase не ставив проєкт на паузу; Docker використовує як healthcheck.
 * При збої віддаємо лише код помилки — без тексту, де можуть бути хост чи користувач.
 */
export async function GET() {
  await connection();
  try {
    await db().execute(sql`select 1`);
    return Response.json({ ok: true, db: "up", time: new Date().toISOString() });
  } catch (error) {
    console.error("health: база недоступна", error);
    return Response.json({ ok: false, db: "down", reason: errorCode(error) }, { status: 503 });
  }
}
