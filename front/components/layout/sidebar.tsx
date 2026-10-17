"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { PersonAvatar } from "@/components/meetups/meetup-cover";
import { buttonVariants } from "@/components/ui/button";
import { accessOf, type Me } from "@/lib/meetups";
import { cn } from "@/lib/utils";

const ACCESS_LABEL = {
  guest: "Гість",
  blocked: "Заблоковано",
  user: "Учасник",
  admin: "Адмін",
} as const;

export function Sidebar({ me }: { me: Me | null }) {
  const pathname = usePathname();
  const access = accessOf(me);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-8 border-r border-border bg-sidebar px-4 py-6 lg:flex">
      <Link
        href="/"
        className="flex items-center gap-2 px-2 text-lg font-semibold tracking-tight outline-none"
      >
        <span
          className="grid size-8 place-items-center rounded-lg bg-primary text-base text-primary-foreground"
          aria-hidden
        >
          В
        </span>
        Вилазки
      </Link>

      <nav aria-label="Головна навігація" className="flex-1">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.filter((item) => !item.adminOnly || access === "admin").map(
            ({ href, label, icon: Icon, match }) => {
              const active = match(pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-secondary text-primary"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            },
          )}
        </ul>
      </nav>

      <div className="flex flex-col gap-4">
        {(access === "user" || access === "admin") && (
          <Link
            href="/meetups/new"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 w-full rounded-full text-sm font-semibold",
            )}
          >
            <Plus className="size-4" aria-hidden />
            Створити вилазку
          </Link>
        )}

        {me ? (
          <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
            <PersonAvatar person={me} className="size-9 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{me.firstName}</p>
              <p className={cn("text-xs", access === "blocked" ? "text-destructive" : "text-muted-foreground")}>
                {ACCESS_LABEL[access]}
              </p>
            </div>
          </div>
        ) : (
          <p className="px-2 text-xs leading-relaxed text-muted-foreground">
            Ти переглядаєш як гість. Відкрий застосунок у Telegram, щоб записуватись на вилазки.
          </p>
        )}
      </div>
    </aside>
  );
}
