import Link from "next/link";
import { CalendarDays, Check, MapPin, Users } from "lucide-react";

import { MeetupCover, OverlayBadge, PersonAvatar } from "@/components/meetups/meetup-cover";
import { formatDayLabel, formatTime, type Meetup } from "@/lib/meetups";
import { cn } from "@/lib/utils";

export function MeetupCard({ meetup }: { meetup: Meetup }) {
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-white/5",
        "transition-colors hover:ring-white/10",
        "focus-within:ring-2 focus-within:ring-ring",
      )}
    >
      <MeetupCover
        meetup={meetup}
        sizes="(min-width: 1280px) 30rem, (min-width: 768px) 45vw, 100vw"
        className="aspect-video w-full"
        imageClassName="transition-transform duration-500 group-hover:scale-[1.03]"
      >
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <OverlayBadge>
            <CalendarDays aria-hidden />
            <span>
              {formatDayLabel(meetup.startsAt)}, {formatTime(meetup.startsAt)}
            </span>
          </OverlayBadge>
          <OverlayBadge className={cn(meetup.isFull && "text-destructive")}>
            <Users aria-hidden />
            <span className="tabular-nums">
              {meetup.attendeesCount} / {meetup.capacity ?? "∞"}
            </span>
          </OverlayBadge>
        </div>
        {meetup.viewer.isJoined && (
          <OverlayBadge className="absolute bottom-3 left-3 bg-primary text-primary-foreground">
            <Check aria-hidden />
            {meetup.viewer.isOrganizer ? "Ти організатор" : "Ти йдеш"}
          </OverlayBadge>
        )}
      </MeetupCover>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          <Link href={`/meetups/${meetup.id}`} className="outline-none">
            <span className="absolute inset-0" aria-hidden />
            {meetup.title} <span aria-hidden>{meetup.category.emoji}</span>
          </Link>
        </h3>

        {meetup.description && (
          <p className="line-clamp-2-safe text-sm leading-relaxed text-muted-foreground">
            {meetup.description}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <PersonAvatar person={meetup.organizer} />
            <span className="truncate text-xs text-muted-foreground">
              Організатор:{" "}
              <span className="font-medium text-primary">{meetup.organizer.firstName}</span>
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0 opacity-70" aria-hidden />
            <span className="truncate">
              {meetup.city}, {meetup.place}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
