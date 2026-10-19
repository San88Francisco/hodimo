import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCheck } from "lucide-react";

import { AdminTabs } from "@/components/admin/admin-tabs";
import { ModerationItem } from "@/components/admin/moderation-item";
import { PageHeader } from "@/components/layout/page-header";
import { getMe, listMeetups } from "@/lib/api";
import { accessOf } from "@/lib/meetups";

export const metadata: Metadata = { title: "Модерація — Ходімо" };

/** Черга модерації: майбутні події користувачів, що чекають на рішення адміна. */
export default async function ModerationPage() {
  const me = await getMe();
  if (accessOf(me) !== "admin") notFound();

  const { items } = await listMeetups({ status: "pending", limit: "50" });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Адмінка" back={{ href: "/", label: "Усі події" }} />
      <AdminTabs active="/admin/moderation" pendingCount={items.length} />

      {items.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Схвалена подія з&apos;явиться в стрічці для всіх. Відхилена лишиться лише в історії автора — він
            зможе виправити її й надіслати знову.
          </p>
          <ul className="flex flex-col gap-8">
            {items.map((meetup) => (
              <ModerationItem key={meetup.id} meetup={meetup} />
            ))}
          </ul>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-14 text-center ring-1 ring-white/5">
          <CheckCheck className="size-8 text-primary" aria-hidden />
          <p className="text-sm font-medium">Усе розглянуто</p>
          <p className="max-w-xs text-sm text-muted-foreground">Нових подій на розгляді немає.</p>
        </div>
      )}
    </div>
  );
}
