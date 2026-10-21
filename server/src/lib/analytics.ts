import { min, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { db, schema } from "@/db";
import { env } from "@/lib/env";

const { users, appVisits: visits } = schema;

/**
 * Відкриття Mini App. Ключ — (користувач, auth_date), тож повторні запити з тими самими
 * initData (перезавантаження сторінки, повторний вхід) рахуються як одне відкриття.
 */
export async function recordVisit(userId: string, openedAt: Date) {
  await db().insert(visits).values({ userId, openedAt }).onConflictDoNothing();
}

export const ANALYTICS_PERIODS = ["today", "week", "month", "halfYear", "all"] as const;
type Period = (typeof ANALYTICS_PERIODS)[number];

/** «Сьогодні» — з опівночі в APP_TIMEZONE, решта — ковзні вікна від цієї миті. */
const SINCE: Record<Period, (column: PgColumn) => SQL> = {
  today: (column) => {
    const tz = env().APP_TIMEZONE;
    return sql`${column} >= date_trunc('day', now() at time zone ${tz}) at time zone ${tz}`;
  },
  week: (column) => sql`${column} >= now() - interval '7 days'`,
  month: (column) => sql`${column} >= now() - interval '30 days'`,
  halfYear: (column) => sql`${column} >= now() - interval '6 months'`,
  all: () => sql`true`,
};

const countWhere = (period: Period, column: PgColumn, value: SQL = sql`*`) =>
  sql<number>`count(${value}) filter (where ${SINCE[period](column)})::int`;

/** Відкриття, різні люди й нові користувачі за кожен період. */
export async function getAnalytics() {
  const [[visitCounts], [userCounts], [first]] = await Promise.all([
    db()
      .select(
        Object.fromEntries(
          ANALYTICS_PERIODS.flatMap((period) => [
            [`${period}:visits`, countWhere(period, visits.openedAt)],
            [`${period}:visitors`, countWhere(period, visits.openedAt, sql`distinct ${visits.userId}`)],
          ]),
        ),
      )
      .from(visits),
    db()
      .select(Object.fromEntries(ANALYTICS_PERIODS.map((period) => [period, countWhere(period, users.createdAt)])))
      .from(users),
    db().select({ openedAt: min(visits.openedAt) }).from(visits),
  ]);

  return {
    totalUsers: userCounts!.all!,
    /** Перше записане відкриття: раніше відкриття не рахувались. */
    trackedSince: first?.openedAt?.toISOString() ?? null,
    periods: ANALYTICS_PERIODS.map((period) => ({
      period,
      visits: visitCounts![`${period}:visits`]!,
      visitors: visitCounts![`${period}:visitors`]!,
      newUsers: userCounts![period]!,
    })),
  };
}
