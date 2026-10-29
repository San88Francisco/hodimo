import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CalendarX,
  ChevronRight,
  Clock3,
  History,
  MapPin,
  Users,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { LocationButton } from "@/components/map/location-view";
import { GroupLink } from "@/components/meetups/group-link";
import { CopyLinkButton } from "@/components/meetups/copy-link-button";
import { MeetupActions } from "@/components/meetups/meetup-actions";
import { MeetupCover, PersonAvatar } from "@/components/meetups/meetup-cover";
import { buttonVariants } from "@/components/ui/button";
import { getMe, getMeetup } from "@/lib/api";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getT } from "@/lib/i18n/server";
import { accessOf, formatFullDate, formatTime, type Meetup, type Person } from "@/lib/meetups";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/meetups/[id]">): Promise<Metadata> {
  const [meetup, { t }] = await Promise.all([getMeetup((await params).id), getT()]);
  return { title: meetup ? `${meetup.title} — Ходімо` : t.meetup.notFound };
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-[15px] font-medium sm:text-sm">{children}</div>
      </div>
    </div>
  );
}

/** Завершену подію не відкриваємо (крім адміна): лише коротко, що вона вже відбулася. */
function PastScreen({ meetup, t, locale }: { meetup: Meetup; t: Dictionary; locale: Locale }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <History className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-bold tracking-tight">{t.meetup.pastTitle}</h1>
      <p className="text-sm text-muted-foreground">
        «{meetup.title}» · {formatFullDate(meetup.startsAt, locale)}
      </p>
      <Link
        href="/"
        className={cn(buttonVariants({ size: "lg" }), "mt-2 h-10 rounded-full px-5 font-semibold")}
      >
        {t.common.toAllMeetups}
      </Link>
    </div>
  );
}

/**
 * Скасування — бачать усі. Статус модерації — лише автор і адміни
 * (іншим непідтверджена подія недоступна).
 */
function StatusNotice({ meetup, isAdminView, t }: { meetup: Meetup; isAdminView: boolean; t: Dictionary }) {
  if (meetup.isPast) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-secondary p-4 text-sm">
        <History className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">{t.meetup.pastNoticeTitle}</span>{" "}
          {t.meetup.pastNoticeBody}
        </p>
      </div>
    );
  }
  if (meetup.isCancelled) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 p-4 text-sm">
        <CalendarX className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <div className="flex flex-col gap-1 text-muted-foreground">
          <p>
            <span className="font-medium text-destructive">{t.meetup.cancelledTitle}</span>{" "}
            {t.meetup.cancelledBody}
          </p>
          {meetup.cancelReason && <p>{t.common.reason(meetup.cancelReason)}</p>}
        </div>
      </div>
    );
  }
  if (meetup.status === "pending") {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-amber-400/10 p-4 text-sm">
        <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden />
        <p className="text-muted-foreground">
          <span className="font-medium text-amber-200">{t.meetup.pendingTitle}</span>{" "}
          {isAdminView ? t.meetup.pendingAdmin : t.meetup.pendingAuthor}
        </p>
      </div>
    );
  }
  if (meetup.status === "rejected") {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 p-4 text-sm">
        <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <div className="flex flex-col gap-1 text-muted-foreground">
          <p>
            <span className="font-medium text-destructive">{t.meetup.rejectedTitle}</span>{" "}
            {t.meetup.rejectedBody}
          </p>
          {meetup.rejectReason && <p>{t.common.reason(meetup.rejectReason)}</p>}
          {!isAdminView && <p>{t.meetup.rejectedFix}</p>}
        </div>
      </div>
    );
  }
  return null;
}

function FillBar({ value, full, label }: { value: number; full: boolean; label: string }) {
  const percent = Math.min(100, Math.round(value * 100));
  return (
    <div
      className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full", full ? "bg-destructive" : "bg-primary")}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function PersonRow({ person, note }: { person: Person; note?: string }) {
  return (
    <li>
      <Link
        href={`/users/${person.id}`}
        className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 outline-none hover:bg-secondary/60 focus-visible:bg-secondary/60"
      >
        <PersonAvatar person={person} className="size-9 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium sm:text-sm">{person.firstName}</p>
          {person.username && (
            <p className="truncate text-xs text-muted-foreground">@{person.username}</p>
          )}
        </div>
        {note && <span className="text-xs text-primary">{note}</span>}
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

export default async function MeetupPage({ params }: PageProps<"/meetups/[id]">) {
  const [meetup, me, { t, locale }] = await Promise.all([getMeetup((await params).id), getMe(), getT()]);
  if (!meetup) notFound();
  const access = accessOf(me);
  if (meetup.isPast && access !== "admin") return <PastScreen meetup={meetup} t={t} locale={locale} />;

  const { capacity, attendeesCount } = meetup;

  return (
    <div className="mx-auto max-w-3xl pb-32 lg:pb-0">
      <PageHeader title={meetup.title} back={{ href: "/", label: t.common.allMeetups }} mobile={false} />

      <article className="flex flex-col gap-5 lg:gap-6">
        {/* На мобільному обкладинка на всю ширину, «назад» — поверх неї. */}
        <MeetupCover
          meetup={meetup}
          priority
          sizes="(min-width: 1024px) 48rem, 100vw"
          className="-mx-4 aspect-4/3 lg:mx-0 lg:aspect-video lg:rounded-2xl lg:ring-1 lg:ring-white/5 [&>span]:text-8xl"
        >
          <Link
            href="/"
            aria-label={t.common.allMeetups}
            className="absolute top-[max(env(safe-area-inset-top),0.75rem)] left-3 grid size-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          {meetup.status === "approved" && !meetup.isPast && !meetup.isCancelled && (
            <CopyLinkButton
              meetupId={meetup.id}
              className="absolute top-[max(env(safe-area-inset-top),0.75rem)] right-3"
            />
          )}
        </MeetupCover>

        <header className="flex flex-col gap-2.5">
          <Link
            href={`/?category=${meetup.category.id}`}
            className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <span aria-hidden>{meetup.category.emoji}</span> {meetup.category.name}
          </Link>
          <h1 className="text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
            {meetup.title}
          </h1>
        </header>

        <StatusNotice meetup={meetup} isAdminView={access === "admin" && !meetup.viewer.isOrganizer} t={t} />

        <section className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-white/5 sm:p-6">
          <InfoRow icon={CalendarDays} label={t.meetup.when}>
            {formatFullDate(meetup.startsAt, locale)} · {formatTime(meetup.startsAt)}
          </InfoRow>
          <InfoRow icon={MapPin} label={t.meetup.where}>
            {meetup.city}, {meetup.place}
            {meetup.location && <LocationButton point={meetup.location} label={meetup.place} />}
          </InfoRow>
          <InfoRow icon={Users} label={t.meetup.participants}>
            {capacity === null ? (
              <>
                <span className="tabular-nums">{attendeesCount}</span>{" "}
                {t.meetup.participantsCount(attendeesCount)}{" "}
                <span className="font-normal text-muted-foreground">· {t.meetup.unlimited}</span>
              </>
            ) : (
              <>
                <span className="tabular-nums">
                  {t.meetup.ofCapacity(attendeesCount, capacity)}
                </span>{" "}
                <span
                  className={cn(
                    "font-normal",
                    meetup.isFull ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  · {meetup.isFull ? t.meetup.noSpots : t.meetup.spotsLeft(capacity - attendeesCount)}
                </span>
                <FillBar value={attendeesCount / capacity} full={meetup.isFull} label={t.meetup.fill} />
              </>
            )}
          </InfoRow>
        </section>

        {meetup.groupUrl && !meetup.isPast && !meetup.isCancelled && <GroupLink href={meetup.groupUrl} />}
        {meetup.description && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{t.meetup.about}</h2>
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground sm:text-base">
              {meetup.description}
            </p>
          </section>
        )}

        <Link
          href={`/users/${meetup.organizer.id}`}
          className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-white/5 outline-none transition-colors hover:ring-white/10 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PersonAvatar person={meetup.organizer} className="size-10 text-sm" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{t.meetup.organizer}</p>
            <p className="truncate text-[15px] font-medium text-primary sm:text-sm">
              {meetup.organizer.firstName}
              {meetup.organizer.username && (
                <span className="font-normal text-muted-foreground"> · @{meetup.organizer.username}</span>
              )}
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>

        {meetup.participants && (
          <section className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-tight">
              {t.meetup.whoGoes} <span className="text-muted-foreground tabular-nums">{meetup.participants.length}</span>
            </h2>
            <ul className="divide-y divide-border">
              {meetup.participants.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  note={person.id === meetup.organizer.id ? t.meetup.organizerNote : undefined}
                />
              ))}
            </ul>
          </section>
        )}

        <MeetupActions meetup={meetup} access={access} />
      </article>
    </div>
  );
}
