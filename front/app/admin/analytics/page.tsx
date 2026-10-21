import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminTabs } from "@/components/admin/admin-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { getAnalytics, getMe, getPendingCount } from "@/lib/api";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { accessOf, formatLongDate } from "@/lib/meetups";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: `${t.nav.analytics} — ${t.admin.title}` };
}

export default async function AdminAnalyticsPage() {
  const me = await getMe();
  if (accessOf(me) !== "admin") notFound();

  const [{ totalUsers, trackedSince, periods }, { t, locale }] = await Promise.all([getAnalytics(), getT()]);
  const number = new Intl.NumberFormat(INTL_LOCALE[locale]);
  const newThisWeek = periods.find((item) => item.period === "week")?.newUsers ?? 0;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.admin.title} back={{ href: "/", label: t.common.allMeetups }} />
      <AdminTabs active="/admin/analytics" pendingCount={await getPendingCount()} />

      <section className="rounded-2xl bg-card p-4 ring-1 ring-white/5">
        <p className="text-sm text-muted-foreground">{t.analytics.totalUsers}</p>
        <p className="mt-1 text-4xl font-bold tabular-nums">{number.format(totalUsers)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.analytics.openedOnce}
          {newThisWeek > 0 && (
            <>
              {" · "}
              <span className="text-emerald-400 tabular-nums">+{number.format(newThisWeek)}</span> {t.analytics.perWeek}
            </>
          )}
        </p>
      </section>

      <section className="mt-3 overflow-hidden rounded-2xl bg-card ring-1 ring-white/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th scope="col" className="py-3 pl-4 text-left font-medium">
                {t.analytics.period}
              </th>
              <th scope="col" className="py-3 text-right font-medium">
                {t.analytics.visits}
              </th>
              <th scope="col" className="py-3 text-right font-medium">
                {t.analytics.visitors}
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-medium">
                {t.analytics.newUsers}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {periods.map((item) => (
              <tr key={item.period}>
                <th scope="row" className="py-3 pl-4 text-left font-medium">
                  {t.analytics.periods[item.period]}
                </th>
                <td className="py-3 text-right text-base font-semibold tabular-nums">{number.format(item.visits)}</td>
                <td className="py-3 text-right tabular-nums">{number.format(item.visitors)}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{number.format(item.newUsers)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-3 px-1 text-xs leading-relaxed text-muted-foreground">
        {t.analytics.note}{" "}
        {trackedSince ? t.analytics.trackedSince(formatLongDate(trackedSince, locale)) : t.analytics.notTracked}
      </p>
    </div>
  );
}
