import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminTabs } from "@/components/admin/admin-tabs";
import { GroupManager } from "@/components/admin/group-manager";
import { PageHeader } from "@/components/layout/page-header";
import { getMe, getPendingCount, listGroups } from "@/lib/api";
import { getT } from "@/lib/i18n/server";
import { accessOf } from "@/lib/meetups";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: `${t.nav.groups} — ${t.admin.title}` };
}

export default async function AdminGroupsPage() {
  const me = await getMe();
  if (accessOf(me) !== "admin") notFound();

  const [groups, { t }] = await Promise.all([listGroups(), getT()]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.admin.title} back={{ href: "/", label: t.common.allMeetups }} />
      <AdminTabs active="/admin/groups" pendingCount={await getPendingCount()} />
      <GroupManager groups={groups} />
    </div>
  );
}
