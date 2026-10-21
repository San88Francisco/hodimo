import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminTabs } from "@/components/admin/admin-tabs";
import { CategoryManager } from "@/components/admin/category-manager";
import { PageHeader } from "@/components/layout/page-header";
import { getMe, getPendingCount, listCategories } from "@/lib/api";
import { getT } from "@/lib/i18n/server";
import { accessOf } from "@/lib/meetups";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: `${t.nav.categories} — ${t.admin.title}` };
}

export default async function AdminCategoriesPage() {
  const me = await getMe();
  if (accessOf(me) !== "admin") notFound();

  const [categories, { t }] = await Promise.all([listCategories(true), getT()]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.admin.title} back={{ href: "/", label: t.common.allMeetups }} />
      <AdminTabs active="/admin/categories" pendingCount={await getPendingCount()} />
      <CategoryManager categories={categories} />
    </div>
  );
}
