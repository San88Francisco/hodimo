import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCheck } from "lucide-react";

import { AdminTabs } from "@/components/admin/admin-tabs";
import { ModerationItem } from "@/components/admin/moderation-item";
import { PageHeader } from "@/components/layout/page-header";
import { getMe, listMeetups } from "@/lib/api";
import { getT } from "@/lib/i18n/server";
import { accessOf } from "@/lib/meetups";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: `${t.nav.moderation} — Ходімо` };
}

/** Черга модерації: майбутні події користувачів, що чекають на рішення адміна. */
export default async function ModerationPage() {
  const me = await getMe();
  if (accessOf(me) !== "admin") notFound();

  const [{ items }, { t }] = await Promise.all([listMeetups({ status: "pending", limit: "50" }), getT()]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.admin.title} back={{ href: "/", label: t.common.allMeetups }} />
      <AdminTabs active="/admin/moderation" pendingCount={items.length} />

      {items.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">{t.admin.moderationHint}</p>
          <ul className="flex flex-col gap-8">
            {items.map((meetup) => (
              <ModerationItem key={meetup.id} meetup={meetup} />
            ))}
          </ul>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-14 text-center ring-1 ring-white/5">
          <CheckCheck className="size-8 text-primary" aria-hidden />
          <p className="text-sm font-medium">{t.admin.allReviewed}</p>
          <p className="max-w-xs text-sm text-muted-foreground">{t.admin.noPending}</p>
        </div>
      )}
    </div>
  );
}
