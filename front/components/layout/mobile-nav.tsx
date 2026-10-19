"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Menu,
  Plus,
  Shapes,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { PersonAvatar } from "@/components/meetups/meetup-cover";
import { accessOf, canCreateMeetups, fullName, ROLE_LABEL, type Me } from "@/lib/meetups";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: (pathname: string) => boolean;
  /** Число праворуч (напр. черга модерації). */
  badge?: number;
};

/** Бургер-меню для мобільного: висувна панель зліва з навігацією за роллю. */
export function MobileNav({ me, pendingCount = 0 }: { me: Me | null; pendingCount?: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const access = accessOf(me);

  const main: Item[] = [
    {
      href: "/",
      label: "Події",
      icon: CalendarDays,
      active: (path) => path === "/" || (path.startsWith("/meetups") && path !== "/meetups/new"),
    },
    ...(me
      ? [
          {
            href: `/users/${me.id}`,
            label: "Мій профіль",
            icon: UserRound,
            active: (path: string) => path === `/users/${me.id}`,
          },
        ]
      : []),
  ];

  const admin: Item[] =
    access === "admin"
      ? [
          {
            href: "/admin/moderation",
            label: "Модерація",
            icon: ClipboardCheck,
            active: (p) => p.startsWith("/admin/moderation"),
            badge: pendingCount,
          },
          { href: "/admin/users", label: "Користувачі", icon: Users, active: (p) => p.startsWith("/admin/users") },
          {
            href: "/admin/categories",
            label: "Категорії",
            icon: Shapes,
            active: (p) => p.startsWith("/admin/categories"),
          },
        ]
      : [];

  const renderItem = ({ href, label, icon: Icon, active, badge }: Item) => {
    const isActive = active(pathname);
    return (
      <li key={href}>
        <Link
          href={href}
          onClick={() => setOpen(false)}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring",
            isActive ? "bg-secondary text-primary" : "text-foreground hover:bg-secondary/60",
          )}
        >
          <Icon className={cn("size-5", isActive ? "text-primary" : "text-muted-foreground")} />
          <span className="flex-1">{label}</span>
          {badge ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-black tabular-nums">
              {badge}
            </span>
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label="Меню"
        className="-ml-2 grid size-10 shrink-0 place-items-center rounded-full text-foreground outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
      >
        <Menu className="size-6" aria-hidden />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 lg:hidden" />
        <Dialog.Popup
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col gap-5 border-r border-border bg-sidebar px-3 outline-none lg:hidden",
            "pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1rem)]",
            "transition-transform duration-200 ease-out data-ending-style:-translate-x-full data-starting-style:-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between px-2">
            <Dialog.Title>
              <Logo className="text-xl" markClassName="size-10" />
            </Dialog.Title>
            <Dialog.Close
              aria-label="Закрити меню"
              className="grid size-10 place-items-center rounded-full text-muted-foreground outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          {me ? (
            <Link
              href={`/users/${me.id}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-white/5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PersonAvatar person={me} className="size-11 text-base" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{fullName(me)}</p>
                <p className={cn("text-xs", me.isBlocked ? "text-destructive" : "text-muted-foreground")}>
                  {me.isBlocked ? "Заблоковано" : ROLE_LABEL[me.role]}
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          ) : (
            <p className="rounded-2xl bg-card p-3 text-sm leading-relaxed text-muted-foreground ring-1 ring-white/5">
              Ти переглядаєш як гість. Відкрий застосунок у Telegram, щоб записуватись на події.
            </p>
          )}

          <nav aria-label="Меню" className="flex flex-1 flex-col gap-5 overflow-y-auto">
            <ul className="flex flex-col gap-1">{main.map(renderItem)}</ul>

            {admin.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Адмінка</p>
                <ul className="flex flex-col gap-1">{admin.map(renderItem)}</ul>
              </div>
            )}

            {process.env.NODE_ENV === "development" && (
              <ul className="mt-auto flex flex-col gap-1">
                {renderItem({ href: "/dev", label: "Dev: змінити користувача", icon: Wrench, active: (p) => p === "/dev" })}
              </ul>
            )}
          </nav>

          {canCreateMeetups(access) && (
            <Link
              href="/meetups/new"
              onClick={() => setOpen(false)}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-5" aria-hidden />
              Створити подію
            </Link>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
