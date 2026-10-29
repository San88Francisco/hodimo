import { and, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import { after } from "next/server";

import { db, schema } from "@/db";
import type { Meetup } from "@/db/schema";
import { BotError, escapeHtml, SEND_INTERVAL_MS, sendPost, sleep, type Post } from "@/lib/bot";
import { env } from "@/lib/env";

const { meetups, meetupParticipants: participants, users } = schema;

/*
 * Сповіщення в Telegram від бота:
 * - анонс — коли подія стає доступною всім (схвалив адмін або створив адмін), один раз;
 * - адмінам — коли подія користувача чекає на розгляд (нова або виправлена після відхилення);
 * - нагадування «завтра» — щодня за cron усім, хто записався на завтрашні події;
 * - скасування — учасникам, коли автор (або адмін) скасував подію.
 * Пишемо лише тим, хто дозволив боту (users.bot_access). Коротко: назва, коли, де, картинка й кнопка.
 */

type Recipient = { id: string; telegramId: number };

function format(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("uk-UA", { timeZone: env().APP_TIMEZONE, ...options }).format(date);
}

const time = (date: Date) => format(date, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** «сб, 25 жовтня, 10:00» */
function dayAndTime(date: Date) {
  const weekday = format(date, { weekday: "short" });
  const day = format(date, { day: "numeric", month: "long" });
  return `${weekday}, ${day}, ${time(date)}`;
}

function openButton(meetup: Meetup, text: string) {
  return { text, web_app: { url: new URL(`/meetups/${meetup.id}`, env().MINI_APP_URL).href } };
}

function announcementPost(meetup: Meetup): Post {
  return {
    text: [
      `🆕 <b>${escapeHtml(meetup.title)}</b>`,
      `📅 ${dayAndTime(meetup.startsAt)}`,
      `📍 ${escapeHtml(meetup.place)}`,
    ].join("\n"),
    photo: meetup.imageUrl,
    button: openButton(meetup, "Подивитися"),
  };
}

function reviewPost(meetup: Meetup, author: string, resubmitted: boolean): Post {
  return {
    text: [
      resubmitted ? "✏️ <b>Подію виправили — знову на розгляді</b>" : "🛎 <b>Нова подія на розгляд</b>",
      "",
      `<b>${escapeHtml(meetup.title)}</b>`,
      `📅 ${dayAndTime(meetup.startsAt)}`,
      `📍 ${escapeHtml(meetup.place)}`,
      `👤 ${escapeHtml(author)}`,
    ].join("\n"),
    photo: meetup.imageUrl,
    button: openButton(meetup, "Розглянути"),
  };
}

function reminderPost(meetup: Meetup): Post {
  return {
    text: [
      `⏰ Завтра: <b>${escapeHtml(meetup.title)}</b>`,
      `🕙 ${time(meetup.startsAt)} · 📍 ${escapeHtml(meetup.place)}`,
    ].join("\n"),
    photo: meetup.imageUrl,
    button: openButton(meetup, "Відкрити подію"),
  };
}

function cancelPost(meetup: Meetup): Post {
  return {
    text: [
      `❌ Скасовано: <b>${escapeHtml(meetup.title)}</b>`,
      `📅 ${dayAndTime(meetup.startsAt)}`,
      ...(meetup.cancelReason ? [`💬 ${escapeHtml(meetup.cancelReason)}`] : []),
    ].join("\n"),
    photo: meetup.imageUrl,
    button: openButton(meetup, "Відкрити подію"),
  };
}

/** Надсилає по черзі в межах ліміту Telegram; хто заблокував бота — більше не отримує. */
async function broadcast(recipients: Recipient[], post: Post, label: string) {
  let sent = 0;
  const unreachable: string[] = [];
  for (const recipient of recipients) {
    try {
      // Після першого успіху шлемо file_id (або вже без картинки, якщо її не прийняли).
      post = { ...post, photo: await sendPost(recipient.telegramId, post) };
      sent++;
    } catch (error) {
      if (error instanceof BotError && error.isUnreachable) unreachable.push(recipient.id);
      else console.error(`notify ${label}: не вдалося надіслати ${recipient.telegramId}`, error);
    }
    await sleep(SEND_INTERVAL_MS);
  }
  if (unreachable.length > 0) {
    await db().update(users).set({ botAccess: false }).where(inArray(users.id, unreachable));
  }
  console.log(`notify ${label}: ${sent}/${recipients.length}, недоступні: ${unreachable.length}`);
}

/** Без MINI_APP_URL (локально) бот мовчить. */
const isEnabled = () => Boolean(env().MINI_APP_URL);

const reachable = and(eq(users.botAccess, true), eq(users.isBlocked, false));

async function announce(meetupId: string) {
  // Позначаємо до розсилки: повторне схвалення чи паралельний запит нічого не продублюють.
  const [meetup] = await db()
    .update(meetups)
    .set({ announcedAt: sql`now()` })
    .where(
      and(
        eq(meetups.id, meetupId),
        eq(meetups.status, "approved"),
        isNull(meetups.cancelledAt),
        isNull(meetups.announcedAt),
        gt(meetups.startsAt, sql`now()`),
      ),
    )
    .returning();
  if (!meetup) return;

  const recipients = await db()
    .select({ id: users.id, telegramId: users.telegramId })
    .from(users)
    .where(and(reachable, eq(users.notifyNewMeetups, true), ne(users.id, meetup.organizerId)));
  await broadcast(recipients, announcementPost(meetup), `анонс ${meetup.id}`);
}

/** Анонс нової події — після відповіді клієнту, щоб адмін не чекав на розсилку. */
export function announceMeetup(meetupId: string) {
  if (!isEnabled()) return;
  after(() => announce(meetupId).catch((error) => console.error("notify анонс", error)));
}

async function requestReview(meetupId: string, resubmitted: boolean) {
  const [row] = await db()
    .select({ meetup: meetups, firstName: users.firstName, lastName: users.lastName, username: users.username })
    .from(meetups)
    .innerJoin(users, eq(users.id, meetups.organizerId))
    .where(and(eq(meetups.id, meetupId), eq(meetups.status, "pending")));
  if (!row) return;

  const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
  const author = row.username ? `${name} (@${row.username})` : name;
  const admins = await db()
    .select({ id: users.id, telegramId: users.telegramId })
    .from(users)
    .where(and(reachable, eq(users.role, "admin")));
  await broadcast(admins, reviewPost(row.meetup, author, resubmitted), `модерація ${meetupId}`);
}

/** Адмінам — що подія чекає на розгляд (нова або виправлена після відхилення). */
export function requestMeetupReview(meetupId: string, { resubmitted = false } = {}) {
  if (!isEnabled()) return;
  after(() => requestReview(meetupId, resubmitted).catch((error) => console.error("notify модерація", error)));
}

async function sendCancelled(meetupId: string, cancelledBy: string) {
  const [meetup] = await db().select().from(meetups).where(eq(meetups.id, meetupId));
  if (!meetup) return;
  const recipients = await db()
    .select({ id: users.id, telegramId: users.telegramId })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .where(and(eq(participants.meetupId, meetupId), ne(users.id, cancelledBy), reachable));
  await broadcast(recipients, cancelPost(meetup), `скасування ${meetupId}`);
}

/** Учасникам — що подію скасовано (крім того, хто скасував); після відповіді клієнту. */
export function notifyCancelled(meetupId: string, cancelledBy: string) {
  if (!isEnabled()) return;
  after(() =>
    sendCancelled(meetupId, cancelledBy).catch((error) => console.error("notify скасування", error)),
  );
}

/** Нагадування учасникам подій, що починаються завтра (за місцевим часом). Викликає cron. */
export async function sendReminders() {
  if (!isEnabled()) return { meetups: 0 };
  const tz = env().APP_TIMEZONE;
  const due = await db()
    .update(meetups)
    .set({ remindedAt: sql`now()` })
    .where(
      and(
        eq(meetups.status, "approved"),
        isNull(meetups.cancelledAt),
        isNull(meetups.remindedAt),
        sql`(${meetups.startsAt} at time zone ${tz})::date = (now() at time zone ${tz})::date + 1`,
      ),
    )
    .returning();

  for (const meetup of due) {
    const recipients = await db()
      .select({ id: users.id, telegramId: users.telegramId })
      .from(participants)
      .innerJoin(users, eq(users.id, participants.userId))
      .where(and(eq(participants.meetupId, meetup.id), reachable));
    await broadcast(recipients, reminderPost(meetup), `нагадування ${meetup.id}`);
  }
  return { meetups: due.length };
}
