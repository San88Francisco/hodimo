import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminTabs } from "@/components/admin/admin-tabs";
import { CategoryManager } from "@/components/admin/category-manager";
import { PageHeader } from "@/components/layout/page-header";
import { getMe, getPendingCount, listCategories } from "@/lib/api";
import { accessOf } from "@/lib/meetups";

export const metadata: Metadata = { title: "Категорії — Адмінка" };

export default async function AdminCategoriesPage() {
  const me = await getMe();
  if (accessOf(me) !== "admin") notFound();

  const categories = await listCategories(true);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Адмінка" back={{ href: "/", label: "Усі події" }} />
      <AdminTabs active="/admin/categories" pendingCount={await getPendingCount()} />
      <CategoryManager categories={categories} />
    </div>
  );
}
