import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";

import { AdminTabs } from "@/components/admin/admin-tabs";
import { UserRow } from "@/components/admin/user-row";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { getMe, listUsers } from "@/lib/api";
import { accessOf } from "@/lib/meetups";

export const metadata: Metadata = { title: "Користувачі — Адмінка" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await getMe();
  if (accessOf(me) !== "admin") notFound();

  const q = (await searchParams).q;
  const query = typeof q === "string" ? q.trim() : "";
  const { items } = await listUsers(query || undefined);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Адмінка" back={{ href: "/", label: "Усі вилазки" }} />
      <AdminTabs active="/admin/users" />

      <form className="relative" role="search">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Ім'я, @username або Telegram ID"
          aria-label="Пошук користувачів"
          className="h-12 rounded-xl pl-10 text-base"
        />
      </form>

      {items.length > 0 ? (
        <ul className="mt-2 divide-y divide-border">
          {items.map((user) => (
            <UserRow key={user.id} user={user} isSelf={user.id === me!.id} />
          ))}
        </ul>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">Нікого не знайдено</p>
      )}
    </div>
  );
}
