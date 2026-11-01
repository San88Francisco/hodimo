"use client";

import { buttonVariants } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { openExternal } from "@/lib/telegram";
import { cn } from "@/lib/utils";

/** Кнопка «Приєднатися до групи». Поза Telegram — звичайне посилання. */
export function GroupLink({ href, className }: { href: string; className?: string }) {
  const { t } = useT();
  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!window.Telegram?.WebApp?.initData) return;
    event.preventDefault();
    openExternal(href);
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn(
        buttonVariants({ size: "lg" }),
        "h-12 w-full rounded-full bg-[#229ED9] px-5 text-base font-semibold text-white hover:bg-[#1c8cc2] lg:h-11 lg:w-auto lg:text-sm",
        className,
      )}
    >
      <TelegramIcon />
      {t.meetup.joinGroup}
    </a>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.94 4.3a1.1 1.1 0 0 0-1.5-1.2L2.7 9.94c-1.2.47-1.18 1.15-.21 1.45l4.55 1.42 1.75 5.4c.22.6.11.84.75.84.49 0 .7-.22.98-.49l2.2-2.14 4.58 3.38c.84.47 1.45.23 1.66-.78l3-14.12ZM8.87 12.4l9.36-5.9c.47-.28.9-.13.55.18l-8.02 7.24-.31 3.33-1.58-4.85Z" />
    </svg>
  );
}
