import Link from "next/link";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/moderation", label: "Модерація" },
  { href: "/admin/users", label: "Користувачі" },
  { href: "/admin/categories", label: "Категорії" },
] as const;

export function AdminTabs({
  active,
  pendingCount = 0,
}: {
  active: (typeof TABS)[number]["href"];
  /** Скільки подій чекає на розгляд — показуємо на вкладці «Модерація». */
  pendingCount?: number;
}) {
  return (
    <nav aria-label="Розділи адмінки" className="mb-5 flex gap-1 rounded-full bg-secondary/60 p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === active ? "page" : undefined}
          className={cn(
            "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-colors lg:flex-none lg:px-5",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring",
            tab.href === active
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
          {tab.href === "/admin/moderation" && pendingCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-black tabular-nums">
              {pendingCount}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
