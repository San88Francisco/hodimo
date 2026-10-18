import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronRight, History, MapPin, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MeetupActions } from "@/components/meetups/meetup-actions";
import { MeetupCover, PersonAvatar } from "@/components/meetups/meetup-cover";
import { getMe, getMeetup } from "@/lib/api";
import {
  accessOf,
  formatFullDate,
  formatLongDate,
  formatTime,
  PAST_RETENTION_DAYS,
  plural,
  type Person,
} from "@/lib/meetups";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/meetups/[id]">): Promise<Metadata> {
  const meetup = await getMeetup((await params).id);
  return { title: meetup ? `${meetup.title} — Ходімо` : "Подію не знайдено" };
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

/** Завершена подія: коли була і скільки ще її зберігатимуть. */
function PastNotice({ expiresAt }: { expiresAt: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-secondary/60 p-4 text-sm">
      <History className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">Подія завершилась.</span> Записатися чи змінити її вже
        не можна. Сторінку буде видалено {formatLongDate(expiresAt)} — через {PAST_RETENTION_DAYS} днів
        після події.
      </p>
    </div>
  );
}

function FillBar({ value, full }: { value: number; full: boolean }) {
  const percent = Math.min(100, Math.round(value * 100));
  return (
    <div
      className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
      role="progressbar"
      aria-label="Заповненість"
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
  const [meetup, me] = await Promise.all([getMeetup((await params).id), getMe()]);
  if (!meetup) notFound();

  const { capacity, attendeesCount } = meetup;

  return (
    <div className="mx-auto max-w-3xl pb-32 lg:pb-0">
      <PageHeader title={meetup.title} back={{ href: "/", label: "Усі події" }} mobile={false} />

      <article className="flex flex-col gap-5 lg:gap-6">
        {/* На мобільному обкладинка на всю ширину, «назад» — поверх неї. */}
        <MeetupCover
          meetup={meetup}
          priority
          sizes="(min-width: 1024px) 48rem, 100vw"
          className={cn(
            "-mx-4 aspect-4/3 lg:mx-0 lg:aspect-video lg:rounded-2xl lg:ring-1 lg:ring-white/5 [&>span]:text-8xl",
            meetup.isPast && "grayscale",
          )}
        >
          <Link
            href="/"
            aria-label="Усі події"
            className="absolute top-[max(env(safe-area-inset-top),0.75rem)] left-3 grid size-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
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

        {meetup.isPast && <PastNotice expiresAt={meetup.expiresAt} />}

        <section className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-white/5 sm:p-6">
          <InfoRow icon={CalendarDays} label="Коли">
            {formatFullDate(meetup.startsAt)} · {formatTime(meetup.startsAt)}
          </InfoRow>
          <InfoRow icon={MapPin} label="Де">
            {meetup.city}, {meetup.place}
          </InfoRow>
          <InfoRow icon={Users} label="Учасники">
            {meetup.isPast ? (
              <>
                Було <span className="tabular-nums">{attendeesCount}</span>{" "}
                {plural(attendeesCount, ["учасник", "учасники", "учасників"])}
              </>
            ) : capacity === null ? (
              <>
                <span className="tabular-nums">{attendeesCount}</span>{" "}
                {plural(attendeesCount, ["учасник", "учасники", "учасників"])}{" "}
                <span className="font-normal text-muted-foreground">· без обмежень</span>
              </>
            ) : (
              <>
                <span className="tabular-nums">
                  {attendeesCount} з {capacity}
                </span>{" "}
                <span
                  className={cn(
                    "font-normal",
                    meetup.isFull ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  · {meetup.isFull ? "місць немає" : `вільно ${capacity - attendeesCount}`}
                </span>
                <FillBar value={attendeesCount / capacity} full={meetup.isFull} />
              </>
            )}
          </InfoRow>
        </section>

        {meetup.description && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Про подію</h2>
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
            <p className="text-xs text-muted-foreground">Організатор</p>
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
              Хто йде <span className="text-muted-foreground tabular-nums">{meetup.participants.length}</span>
            </h2>
            <ul className="divide-y divide-border">
              {meetup.participants.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  note={person.id === meetup.organizer.id ? "організатор" : undefined}
                />
              ))}
            </ul>
          </section>
        )}

        <MeetupActions meetup={meetup} access={accessOf(me)} />
      </article>
    </div>
  );
}
