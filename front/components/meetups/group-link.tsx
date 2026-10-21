"use client";

import { MessagesSquare } from "lucide-react";

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
        buttonVariants({ variant: "secondary", size: "lg" }),
        "h-12 w-full rounded-full px-5 text-base font-semibold lg:h-11 lg:w-auto lg:text-sm",
        className,
      )}
    >
      <MessagesSquare className="text-primary" aria-hidden />
      {t.meetup.joinGroup}
    </a>
  );
}
