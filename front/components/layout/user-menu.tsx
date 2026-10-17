"use client";

import Link from "next/link";
import { ChevronRight, ShieldCheck, User, UserRound, Wrench } from "lucide-react";

import { PersonAvatar } from "@/components/meetups/meetup-cover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { accessOf, type Access, type Me } from "@/lib/meetups";
import { cn } from "@/lib/utils";

const ROLE: Record<Access, { label: string; tone: string }> = {
  guest: { label: "Гість", tone: "bg-secondary text-muted-foreground" },
  user: { label: "Учасник", tone: "bg-secondary text-foreground" },
  organizer: { label: "Організатор", tone: "bg-sky-500/15 text-sky-300" },
  admin: { label: "Адмін", tone: "bg-primary/15 text-primary" },
  blocked: { label: "Заблоковано", tone: "bg-destructive/15 text-destructive" },
};

function MenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium outline-none hover:bg-secondary focus-visible:bg-secondary"
    >
      <Icon className="size-4.5 text-muted-foreground" />
      <span className="flex-1">{children}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

/** Аватар у шапці: показує, хто зайшов, і відкриває картку профілю. */
export function UserMenu({ me }: { me: Me | null }) {
  const access = accessOf(me);
  const role = ROLE[access];
  const isDev = process.env.NODE_ENV === "development";

  return (
    <Popover>
      <PopoverTrigger
        aria-label={me ? `Профіль: ${me.firstName}` : "Профіль гостя"}
        className="grid size-9 shrink-0 place-items-center rounded-full outline-none ring-2 ring-transparent transition-shadow focus-visible:ring-ring data-popup-open:ring-primary"
      >
        {me ? (
          <PersonAvatar person={me} className="size-9 text-sm" />
        ) : (
          <span className="grid size-9 place-items-center rounded-full bg-secondary text-muted-foreground">
            <User className="size-5" aria-hidden />
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(20rem,calc(100vw-2rem))] gap-3 rounded-2xl bg-card p-3 ring-white/10 shadow-xl shadow-black/40"
      >
        <div className="flex items-center gap-3 p-1">
          {me ? (
            <PersonAvatar person={me} className="size-14 text-xl" />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
              <User className="size-7" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">
              {me ? [me.firstName, me.lastName].filter(Boolean).join(" ") : "Гість"}
            </p>
            {me?.username && (
              <a
                href={`https://t.me/${me.username}`}
                className="block truncate text-sm text-muted-foreground hover:text-primary"
              >
                @{me.username}
              </a>
            )}
            {me && (
              <span
                className={cn("mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium", role.tone)}
              >
                {role.label}
              </span>
            )}
          </div>
        </div>

        {access === "guest" && (
          <p className="px-1 text-sm leading-relaxed text-muted-foreground">
            Відкрий застосунок у Telegram, щоб записуватись і створювати події.
          </p>
        )}
        {access === "blocked" && (
          <p className="px-1 text-sm leading-relaxed text-muted-foreground">
            Ти можеш переглядати події, але не записуватись і не створювати.
          </p>
        )}

        {(me || isDev) && (
          <nav className="flex flex-col border-t border-border pt-2">
            {me && (
              <MenuLink href={`/users/${me.id}`} icon={UserRound}>
                Мій профіль
              </MenuLink>
            )}
            {access === "admin" && (
              <MenuLink href="/admin/users" icon={ShieldCheck}>
                Адмінка
              </MenuLink>
            )}
            {isDev && (
              <MenuLink href="/dev" icon={Wrench}>
                Dev: змінити користувача
              </MenuLink>
            )}
          </nav>
        )}
      </PopoverContent>
    </Popover>
  );
}
