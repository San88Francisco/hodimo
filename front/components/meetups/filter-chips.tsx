import Link from "next/link";

import { DATE_FILTERS, type Category, type FeedFilter } from "@/lib/meetups";
import { cn } from "@/lib/utils";

/** Фільтри — звичайні посилання, тож стан живе в URL і переживає перезавантаження. */
export function FilterChips({ value, categories }: { value: FeedFilter; categories: Category[] }) {
  const chips = [
    { key: "all", label: "Усі", href: "/", active: value.kind === "all" },
    ...DATE_FILTERS.map((item) => ({
      key: item.id,
      label: item.label,
      href: `/?filter=${item.id}`,
      active: value.kind === "date" && value.id === item.id,
    })),
    ...categories.map((category) => ({
      key: category.id,
      label: `${category.emoji} ${category.name}`,
      href: `/?category=${category.id}`,
      active: value.kind === "category" && value.id === category.id,
    })),
  ];

  return (
    <nav
      aria-label="Фільтри вилазок"
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0"
    >
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          scroll={false}
          aria-current={chip.active ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring",
            chip.active
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/60 text-muted-foreground ring-1 ring-white/8 hover:bg-secondary hover:text-foreground",
          )}
        >
          {chip.label}
        </Link>
      ))}
    </nav>
  );
}
