"use client";

import { GroupAvatar } from "@/components/meetups/meetup-cover";
import { buttonVariants } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import type { Group } from "@/lib/meetups";
import { openExternal } from "@/lib/telegram";
import { cn } from "@/lib/utils";

/** Посилання в Telegram: у Mini App відкриває сам Telegram, поза ним — звичайна нова вкладка. */
function TelegramAnchor({ href, ...props }: React.ComponentProps<"a"> & { href: string }) {
  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!window.Telegram?.WebApp?.initData) return;
    event.preventDefault();
    openExternal(href);
  }
  return <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} {...props} />;
}

/** Кнопка «Приєднатися до групи». */
export function GroupLink({ href, className }: { href: string; className?: string }) {
  const { t } = useT();
  return (
    <TelegramAnchor
      href={href}
      className={cn(
        buttonVariants({ size: "lg" }),
        "h-12 w-full rounded-full bg-[#229ED9] px-5 text-base font-semibold text-white hover:bg-[#1c8cc2] lg:h-11 lg:w-auto lg:text-sm",
        className,
      )}
    >
      <TelegramIcon />
      {t.meetup.joinGroup}
    </TelegramAnchor>
  );
}

/** Група-організатор у підвалі картки; стоїть над посиланням на подію, що вкриває всю картку. */
export function GroupBadge({ group }: { group: Group }) {
  const { t } = useT();
  return (
    <TelegramAnchor
      href={group.url}
      aria-label={t.card.openGroup(group.name)}
      className="relative z-10 -my-1.5 flex min-w-0 items-center gap-2 rounded-full py-1.5 pr-2 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <GroupAvatar group={group} />
      <span className="truncate">
        {t.card.organizer} <span className="font-medium text-primary">{group.name}</span>
      </span>
      <TelegramIcon className="size-3.5 shrink-0 text-[#229ED9]" />
    </TelegramAnchor>
  );
}

/** Блок групи на сторінці події: клік відкриває групу в Telegram. */
export function GroupCard({ group }: { group: Group }) {
  const { t } = useT();
  return (
    <TelegramAnchor
      href={group.url}
      aria-label={t.card.openGroup(group.name)}
      className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-white/5 outline-none transition-colors hover:ring-white/10 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <GroupAvatar group={group} className="size-10 text-sm" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{t.meetup.groupOrganizer}</p>
        <p className="truncate text-[15px] font-medium text-primary sm:text-sm">{group.name}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-[#229ED9]">
        <TelegramIcon className="size-4" />
        <span className="hidden sm:inline">{t.meetup.openInTelegram}</span>
      </span>
    </TelegramAnchor>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M21.94 4.3a1.1 1.1 0 0 0-1.5-1.2L2.7 9.94c-1.2.47-1.18 1.15-.21 1.45l4.55 1.42 1.75 5.4c.22.6.11.84.75.84.49 0 .7-.22.98-.49l2.2-2.14 4.58 3.38c.84.47 1.45.23 1.66-.78l3-14.12ZM8.87 12.4l9.36-5.9c.47-.28.9-.13.55.18l-8.02 7.24-.31 3.33-1.58-4.85Z" />
    </svg>
  );
}
