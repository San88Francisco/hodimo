import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarHeart, Plus, ShieldCheck, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MeetupCard } from "@/components/meetups/meetup-card";
import { PersonAvatar } from "@/components/meetups/meetup-cover";
import { NotificationSettings } from "@/components/notifications/notifications";
import { buttonVariants } from "@/components/ui/button";
import { getMe, getProfile, listMeetups } from "@/lib/api";
import { getT } from "@/lib/i18n/server";
import { accessOf, canCreateMeetups, formatLongDate, fullName, type Meetup } from "@/lib/meetups";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/users/[id]">): Promise<Metadata> {
  const [profile, { t }] = await Promise.all([getProfile((await params).id), getT()]);
  return { title: profile ? `${fullName(profile)} — Ходімо` : t.profile.notFound };
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
  const [profile, me, { t, locale }] = await Promise.all([getProfile(id), getMe(), getT()]);
  if (!profile) notFound();

  const access = accessOf(me);
  const canCreate = profile.isSelf && canCreateMeetups(access);
  const [organized, joined, pastOrganized, pastJoined] = await Promise.all([
    listMeetups({ organizer: profile.id }),
    profile.isSelf ? listMeetups({ joined: "me" }) : null,
    listMeetups({ organizer: profile.id, when: "past" }),
    profile.isSelf ? listMeetups({ joined: "me", when: "past" }) : null,
  ]);
  // Історія: завершені власні події (у своєму профілі — з усіма статусами) + ті, куди ходив; свіжіші — вище.
  const past = [...pastOrganized.items, ...(pastJoined?.items ?? [])].sort((a, b) =>
    b.startsAt.localeCompare(a.startsAt),
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={profile.isSelf ? t.common.myProfile : t.profile.title}
        back={{ href: "/", label: t.common.allMeetups }}
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
                {t.roles[profile.role]}
              </span>
            )}
            {profile.isBlocked && (
              <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive">
                {t.common.blocked}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t.profile.since(formatLongDate(profile.createdAt, locale))}
            {profile.telegramId !== null && ` · Telegram ID ${profile.telegramId}`}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          icon={CalendarHeart}
          value={profile.stats.organized}
          label={t.profile.organized(profile.stats.organized)}
        />
        <Stat
          icon={Users}
          value={profile.stats.joined}
          label={t.profile.joined(profile.stats.joined)}
        />
      </div>

      {profile.isSelf && me && !me.isBlocked && <NotificationSettings me={me} />}

      {access === "admin" && !profile.isSelf && (
        <Link
          href={`/admin/users?q=${profile.telegramId ?? profile.username ?? ""}`}
          className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "h-11 w-fit rounded-full px-4")}
        >
          <ShieldCheck aria-hidden />
          {t.profile.manage}
        </Link>
      )}

      <MeetupSection
        title={profile.isSelf ? t.profile.myMeetups : t.profile.organizes}
        meetups={organized.items}
        empty={
          profile.isSelf ? (
            <div className="flex flex-col items-center gap-3">
              <p>{t.profile.emptyMine}</p>
              {canCreate && (
                <Link
                  href="/meetups/new"
                  className={cn(buttonVariants({ size: "lg" }), "h-10 rounded-full px-5 font-semibold")}
                >
                  <Plus aria-hidden />
                  {t.common.createMeetup}
                </Link>
              )}
            </div>
          ) : (
            t.profile.emptyOther
          )
        }
      />

      {joined && (
        <MeetupSection
          title={t.profile.going}
          meetups={joined.items}
          empty={
            <>
              {t.profile.goingEmpty}{" "}
              <Link href="/" className="text-primary underline-offset-4 hover:underline">
                {t.profile.browse}
              </Link>
            </>
          }
        />
      )}

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {t.profile.history} <span className="text-muted-foreground tabular-nums">{past.length}</span>
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {past.map((meetup) => (
              <MeetupCard key={meetup.id} meetup={meetup} isAdmin={access === "admin"} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
