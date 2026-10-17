import Link from "next/link";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/users", label: "Користувачі" },
  { href: "/admin/categories", label: "Категорії" },
] as const;

export function AdminTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Розділи адмінки" className="mb-5 flex gap-1 rounded-full bg-secondary/60 p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === active ? "page" : undefined}
          className={cn(
            "flex h-10 flex-1 items-center justify-center rounded-full text-sm font-medium transition-colors lg:flex-none lg:px-5",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring",
            tab.href === active
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
