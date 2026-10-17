import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";

import { AdminTabs } from "@/components/admin/admin-tabs";
import { UserRow } from "@/components/admin/user-row";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMe, listUsers, USER_FILTERS, type UserFilter } from "@/lib/api";
import { accessOf } from "@/lib/meetups";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Користувачі — Адмінка" };

const FILTER_LABEL: Record<UserFilter, string> = {
  all: "Усі",
  user: "Учасники",
  organizer: "Організатори",
  admin: "Адміни",
  blocked: "Заблоковані",
};

const PAGE = 50;

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await getMe();
  if (accessOf(me) !== "admin") notFound();

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const filter = USER_FILTERS.find((item) => item === params.filter) ?? "all";
  const limit = Math.min(500, Math.max(PAGE, Number(params.limit) || PAGE));
  const { items, nextOffset, counts } = await listUsers({ q: q || undefined, filter, limit });

  /** Посилання зі збереженням пошуку. */
  const href = (next: { filter?: UserFilter; limit?: number }) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    const nextFilter = next.filter ?? filter;
    if (nextFilter !== "all") query.set("filter", nextFilter);
    if (next.limit) query.set("limit", String(next.limit));
    const qs = query.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Адмінка" back={{ href: "/", label: "Усі події" }} />
      <AdminTabs active="/admin/users" />

      <form className="relative" role="search">
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Ім'я, @username або Telegram ID"
          aria-label="Пошук користувачів"
          className="h-12 rounded-xl pl-10 text-base"
        />
      </form>

      <nav
        aria-label="Фільтр користувачів"
        className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0"
      >
        {USER_FILTERS.map((item) => {
          const active = item === filter;
          return (
            <Link
              key={item}
              href={href({ filter: item })}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground ring-1 ring-white/8 hover:bg-secondary hover:text-foreground",
              )}
            >
              {FILTER_LABEL[item]}
              <span className={cn("tabular-nums", active ? "opacity-70" : "opacity-60")}>{counts[item]}</span>
            </Link>
          );
        })}
      </nav>

      {items.length > 0 ? (
        <ul className="mt-2 divide-y divide-border">
          {items.map((user) => (
            <UserRow key={user.id} user={user} isSelf={user.id === me!.id} />
          ))}
        </ul>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">Нікого не знайдено</p>
      )}

      {nextOffset !== null && limit < 500 && (
        <Link
          href={href({ limit: limit + PAGE })}
          scroll={false}
          className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "mt-4 h-11 w-full rounded-full")}
        >
          Показати ще
        </Link>
      )}
    </div>
  );
}
