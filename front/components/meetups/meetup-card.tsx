import Link from "next/link";
import { CalendarDays, Check, Clock3, History, MapPin, Users, XCircle } from "lucide-react";

import { CardDeleteButton } from "@/components/meetups/card-delete-button";
import { MeetupCover, OverlayBadge, PersonAvatar } from "@/components/meetups/meetup-cover";
import { formatDayLabel, formatTime, STATUS_LABEL, type Meetup } from "@/lib/meetups";
import { cn } from "@/lib/utils";

/** Стан у нижньому куті обкладинки: завершена → статус модерації → «ти йдеш». */
function StateBadge({ meetup }: { meetup: Meetup }) {
  if (meetup.isPast) {
    return (
      <OverlayBadge className="absolute bottom-3 left-3">
        <History aria-hidden />
        Завершилась
      </OverlayBadge>
    );
  }
  if (meetup.status === "pending") {
    return (
      <OverlayBadge className="absolute bottom-3 left-3 bg-amber-400 text-black">
        <Clock3 aria-hidden />
        {STATUS_LABEL.pending}
      </OverlayBadge>
    );
  }
  if (meetup.status === "rejected") {
    return (
      <OverlayBadge className="absolute bottom-3 left-3 bg-destructive text-white">
        <XCircle aria-hidden />
        {STATUS_LABEL.rejected}
      </OverlayBadge>
    );
  }
  if (meetup.viewer.isJoined) {
    return (
      <OverlayBadge className="absolute bottom-3 left-3 bg-primary text-primary-foreground">
        <Check aria-hidden />
        {meetup.viewer.isOrganizer ? "Ти організатор" : "Ти йдеш"}
      </OverlayBadge>
    );
  }
  return null;
}

/**
 * Картка події. Завершена — з плашкою «Завершилась» і не відкривається: лишається як запис в історії.
 * canDelete (адмін) — кнопка видалення просто на картці, бо завершену подію не відкрити.
 */
export function MeetupCard({ meetup, canDelete = false }: { meetup: Meetup; canDelete?: boolean }) {
  const inactive = meetup.isPast;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-white/5",
        !inactive &&
          "transition-colors hover:ring-white/10 focus-within:ring-2 focus-within:ring-ring",
      )}
    >
      <MeetupCover
        meetup={meetup}
        sizes="(min-width: 1280px) 30rem, (min-width: 768px) 45vw, 100vw"
        className="aspect-video w-full"
        imageClassName={cn(!inactive && "transition-transform duration-500 group-hover:scale-[1.03]")}
      >
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <OverlayBadge>
            <CalendarDays aria-hidden />
            <span>
              {formatDayLabel(meetup.startsAt)}, {formatTime(meetup.startsAt)}
            </span>
          </OverlayBadge>
          <OverlayBadge className={cn(meetup.isFull && !inactive && "text-destructive")}>
            <Users aria-hidden />
            <span className="tabular-nums">
              {meetup.attendeesCount} / {meetup.capacity ?? "∞"}
            </span>
          </OverlayBadge>
        </div>
        <StateBadge meetup={meetup} />
        {canDelete && <CardDeleteButton meetupId={meetup.id} className="absolute right-3 bottom-3" />}
      </MeetupCover>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {inactive ? (
            <>
              {meetup.title} <span aria-hidden>{meetup.category.emoji}</span>
            </>
          ) : (
            <Link href={`/meetups/${meetup.id}`} className="outline-none">
              <span className="absolute inset-0" aria-hidden />
              {meetup.title} <span aria-hidden>{meetup.category.emoji}</span>
            </Link>
          )}
        </h3>

        {meetup.status === "rejected" && meetup.rejectReason && !inactive && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Причина: {meetup.rejectReason}
          </p>
        )}

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
