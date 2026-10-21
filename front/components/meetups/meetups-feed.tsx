import Link from "next/link";
import { CalendarX2 } from "lucide-react";

import { FilterChips } from "@/components/meetups/filter-chips";
import { MeetupCard } from "@/components/meetups/meetup-card";
import { buttonVariants } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";
import type { Category, FeedFilter, Meetup } from "@/lib/meetups";
import { cn } from "@/lib/utils";

export async function MeetupsFeed({
  meetups,
  filter,
  categories,
  canCreate,
  isAdmin,
}: {
  meetups: Meetup[];
  filter: FeedFilter;
  categories: Category[];
  canCreate: boolean;
  /** Адмін відкриває й видаляє будь-яку подію, зокрема завершену. */
  isAdmin: boolean;
}) {
  const { t } = await getT();
  return (
    <>
      <div className="sticky top-14 z-20 -mt-px bg-background/85 py-3 backdrop-blur-md lg:static lg:bg-transparent lg:py-0 lg:backdrop-blur-none">
        <FilterChips value={filter} categories={categories} />
      </div>

      {meetups.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5 2xl:grid-cols-3">
          {meetups.map((meetup) => (
            <MeetupCard key={meetup.id} meetup={meetup} isAdmin={isAdmin} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-14 text-center ring-1 ring-white/5">
          <CalendarX2 className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">{t.feed.emptyTitle}</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {filter.kind === "all" ? t.feed.emptyAll : t.feed.emptyFiltered}
            {canCreate && t.feed.emptyCta}
          </p>
          {canCreate && (
            <Link
              href="/meetups/new"
              className={cn(buttonVariants({ size: "lg" }), "mt-2 h-10 rounded-full px-5 font-semibold")}
            >
              {t.common.createMeetup}
            </Link>
          )}
        </div>
      )}
    </>
  );
}
