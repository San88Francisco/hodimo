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
 * - нагадування «завтра» — щодня за cron усім, хто записався на завтрашні події.
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
