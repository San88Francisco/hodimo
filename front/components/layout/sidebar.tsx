"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { PersonAvatar } from "@/components/meetups/meetup-cover";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { buttonVariants } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { accessOf, canCreateMeetups, type Access, type Me } from "@/lib/meetups";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

const accessLabel = (t: Dictionary, access: Access) =>
  access === "guest" ? t.common.guest : access === "blocked" ? t.common.blocked : t.roles[access];

export function Sidebar({ me }: { me: Me | null }) {
  const pathname = usePathname();
  const access = accessOf(me);
  const { t } = useT();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-8 border-r border-border bg-sidebar px-4 py-6 lg:flex">
      <Link href="/" aria-label={t.nav.home} className="px-1 outline-none">
        <Logo className="text-xl" markClassName="h-10" />
      </Link>

      <nav aria-label={t.nav.main} className="flex-1">
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
                    {label(t)}
                  </Link>
                </li>
              );
            },
          )}
        </ul>
      </nav>

      <div className="flex flex-col gap-4">
        {canCreateMeetups(access) && (
          <Link
            href="/meetups/new"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 w-full rounded-full text-sm font-semibold",
            )}
          >
            <Plus className="size-4" aria-hidden />
            {t.common.createMeetup}
          </Link>
        )}

        {me ? (
          <Link
            href={`/users/${me.id}`}
            className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3 outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PersonAvatar person={me} className="size-9 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{me.firstName}</p>
              <p className={cn("text-xs", access === "blocked" ? "text-destructive" : "text-muted-foreground")}>
                {accessLabel(t, access)}
              </p>
            </div>
          </Link>
        ) : (
          <p className="px-2 text-xs leading-relaxed text-muted-foreground">{t.access.guestShort}</p>
        )}

        <LanguageSwitcher />
      </div>
    </aside>
  );
}
