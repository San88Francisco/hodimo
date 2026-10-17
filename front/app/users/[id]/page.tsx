import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarHeart, Plus, ShieldCheck, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MeetupCard } from "@/components/meetups/meetup-card";
import { PersonAvatar } from "@/components/meetups/meetup-cover";
import { buttonVariants } from "@/components/ui/button";
import { getMe, getProfile, listMeetups } from "@/lib/api";
import {
  accessOf,
  canCreateMeetups,
  formatLongDate,
  fullName,
  plural,
  ROLE_LABEL,
  type Meetup,
} from "@/lib/meetups";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/users/[id]">): Promise<Metadata> {
  const profile = await getProfile((await params).id);
  return { title: profile ? `${fullName(profile)} — Ходімо` : "Користувача не знайдено" };
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-white/5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xl leading-none font-bold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function MeetupSection({
  title,
  meetups,
  empty,
}: {
  title: string;
  meetups: Meetup[];
  empty: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">
        {title} {meetups.length > 0 && <span className="text-muted-foreground tabular-nums">{meetups.length}</span>}
      </h2>
      {meetups.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {meetups.map((meetup) => (
            <MeetupCard key={meetup.id} meetup={meetup} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-card px-5 py-8 text-center text-sm text-muted-foreground ring-1 ring-white/5">
          {empty}
        </div>
      )}
    </section>
  );
}

export default async function ProfilePage({ params }: PageProps<"/users/[id]">) {
  const { id } = await params;
  const [profile, me] = await Promise.all([getProfile(id), getMe()]);
  if (!profile) notFound();

  const access = accessOf(me);
  const canCreate = profile.isSelf && canCreateMeetups(access);
  const [organized, joined] = await Promise.all([
    listMeetups({ organizer: profile.id }),
    profile.isSelf ? listMeetups({ joined: "me" }) : null,
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={profile.isSelf ? "Мій профіль" : "Профіль"}
        back={{ href: "/", label: "Усі події" }}
      />

      <section className="flex flex-col items-center gap-4 rounded-2xl bg-card p-6 text-center ring-1 ring-white/5 sm:flex-row sm:text-left">
        <PersonAvatar person={profile} className="size-24 text-3xl" />
        <div className="flex min-w-0 flex-col items-center gap-1.5 sm:items-start">
          <h1 className="text-2xl leading-tight font-bold tracking-tight">{fullName(profile)}</h1>
          {profile.username && (
            <a
              href={`https://t.me/${profile.username}`}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              @{profile.username}
            </a>
          )}
          <div className="mt-1 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {profile.role !== "user" && (
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                {ROLE_LABEL[profile.role]}
              </span>
            )}
            {profile.isBlocked && (
              <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive">
                Заблоковано
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            З нами з {formatLongDate(profile.createdAt)}
            {profile.telegramId !== null && ` · Telegram ID ${profile.telegramId}`}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          icon={CalendarHeart}
          value={profile.stats.organized}
          label={plural(profile.stats.organized, [
            "подія організована",
            "події організовано",
            "подій організовано",
          ])}
        />
        <Stat
          icon={Users}
          value={profile.stats.joined}
          label={plural(profile.stats.joined, [
            "долучення до події",
            "долучення до подій",
            "долучень до подій",
          ])}
        />
      </div>

      {access === "admin" && !profile.isSelf && (
        <Link
          href={`/admin/users?q=${profile.telegramId ?? profile.username ?? ""}`}
          className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "h-11 w-fit rounded-full px-4")}
        >
          <ShieldCheck aria-hidden />
          Керувати в адмінці
        </Link>
      )}

      <MeetupSection
        title={profile.isSelf ? "Я організовую" : "Організовує"}
        meetups={organized.items}
        empty={
          profile.isSelf ? (
            <div className="flex flex-col items-center gap-3">
              <p>Поки що жодної події.</p>
              {canCreate && (
                <Link
                  href="/meetups/new"
                  className={cn(buttonVariants({ size: "lg" }), "h-10 rounded-full px-5 font-semibold")}
                >
                  <Plus aria-hidden />
                  Створити подію
                </Link>
              )}
            </div>
          ) : (
            "Найближчих подій немає."
          )
        }
      />

      {joined && (
        <MeetupSection
          title="Я йду"
          meetups={joined.items}
          empty={
            <>
              Поки що ти нікуди не йдеш.{" "}
              <Link href="/" className="text-primary underline-offset-4 hover:underline">
                Подивитися події
              </Link>
            </>
          }
        />
      )}
    </div>
  );
}
