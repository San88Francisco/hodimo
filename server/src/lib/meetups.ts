import { and, asc, count, eq, gte, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { requireActiveCategory, toCategoryDto } from "@/lib/categories";
import { env } from "@/lib/env";
import { conflict, forbidden, notFound } from "@/lib/http";

const { categories, meetups, meetupParticipants: participants, users } = schema;

// ---------- Валідація ----------

const meetupFields = {
  title: z.string().trim().min(3, "Мінімум 3 символи").max(80, "Максимум 80 символів"),
  description: z.string().trim().max(1000, "Максимум 1000 символів"),
  categoryId: z.uuid("Обери категорію"),
  startsAt: z.iso
    .datetime({ offset: true, message: "Дата у форматі ISO 8601" })
    .transform((value) => new Date(value))
    .refine((date) => date.getTime() > Date.now(), "Цей час уже минув"),
  /** null — без обмежень. */
  capacity: z.number().int().min(2, "Мінімум 2").max(100, "Максимум 100").nullable(),
  city: z.string().trim().min(2, "Мінімум 2 символи").max(80),
  place: z.string().trim().min(2, "Мінімум 2 символи").max(120),
  imageUrl: z.url({ protocol: /^https?$/ }).nullable(),
};

export const CreateMeetupSchema = z.object({
  ...meetupFields,
  description: meetupFields.description.default(""),
  imageUrl: meetupFields.imageUrl.default(null),
});

export const UpdateMeetupSchema = z
  .object(meetupFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Немає полів для оновлення");

export const ListMeetupsQuerySchema = z.object({
  date: z.enum(["today", "weekend"]).optional(),
  category: z.uuid().optional(),
  city: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ---------- Права ----------

/** Організатор своєї вилазки або адмін; заблоковані нічим не керують. */
function canManage(viewer: User | null, organizerId: string) {
  if (!viewer || viewer.isBlocked) return false;
  return viewer.id === organizerId || viewer.role === "admin";
}

// ---------- Запити ----------

const attendeesCount = sql<number>`(
  select count(*)::int from ${participants}
  where ${participants.meetupId} = ${meetups.id}
)`;

function isJoinedBy(viewerId: string | undefined) {
  if (!viewerId) return sql<boolean>`false`;
  return sql<boolean>`exists(
    select 1 from ${participants}
    where ${participants.meetupId} = ${meetups.id} and ${participants.userId} = ${viewerId}
  )`;
}

function localDate(value: SQL | typeof meetups.startsAt, tz: string) {
  return sql`(${value} at time zone ${tz})::date`;
}

function dateFilter(date: "today" | "weekend"): SQL {
  const tz = env().APP_TIMEZONE;
  const startsOn = localDate(meetups.startsAt, tz);
  const today = localDate(sql`now()`, tz);
  if (date === "today") return sql`${startsOn} = ${today}`;
  // Найближчі субота–неділя; у неділю це «вчора й сьогодні».
  const saturday = sql`(${today} + (6 - extract(isodow from ${today}))::int)`;
  return sql`${startsOn} between ${saturday} and ${saturday} + 1`;
}

const personFields = {
  id: users.id,
  firstName: users.firstName,
  username: users.username,
  photoUrl: users.photoUrl,
};

function selectMeetups(viewer: User | null) {
  return db()
    .select({
      meetup: meetups,
      category: categories,
      organizer: personFields,
      attendeesCount,
      isJoined: isJoinedBy(viewer?.id),
    })
    .from(meetups)
    .innerJoin(categories, eq(categories.id, meetups.categoryId))
    .innerJoin(users, eq(users.id, meetups.organizerId));
}

type MeetupRow = Awaited<ReturnType<typeof selectMeetups>>[number];

function toDto(row: MeetupRow, viewer: User | null) {
  const { meetup, category, organizer } = row;
  return {
    id: meetup.id,
    title: meetup.title,
    description: meetup.description,
    category: toCategoryDto(category),
    startsAt: meetup.startsAt.toISOString(),
    capacity: meetup.capacity,
    attendeesCount: row.attendeesCount,
    isFull: meetup.capacity !== null && row.attendeesCount >= meetup.capacity,
    city: meetup.city,
    place: meetup.place,
    imageUrl: meetup.imageUrl,
    organizer,
    viewer: {
      isJoined: row.isJoined,
      isOrganizer: viewer?.id === meetup.organizerId,
      canManage: canManage(viewer, meetup.organizerId),
    },
    createdAt: meetup.createdAt.toISOString(),
  };
}

export async function listMeetups(
  query: z.infer<typeof ListMeetupsQuerySchema>,
  viewer: User | null,
) {
  const conditions: SQL[] = [gte(meetups.startsAt, sql`now()`)];
  if (query.date) conditions.push(dateFilter(query.date));
  if (query.category) conditions.push(eq(meetups.categoryId, query.category));
  if (query.city) conditions.push(sql`lower(${meetups.city}) = lower(${query.city})`);

  const rows = await selectMeetups(viewer)
    .where(and(...conditions))
    .orderBy(asc(meetups.startsAt), asc(meetups.id))
    .limit(query.limit + 1)
    .offset(query.offset);

  const hasMore = rows.length > query.limit;
  return {
    items: rows.slice(0, query.limit).map((row) => toDto(row, viewer)),
    nextOffset: hasMore ? query.offset + query.limit : null,
  };
}

/** Деталі вилазки. Список учасників бачать лише організатор і адміни. */
export async function getMeetup(id: string, viewer: User | null) {
  const [row] = await selectMeetups(viewer).where(eq(meetups.id, id)).limit(1);
  if (!row) throw notFound("Вилазку не знайдено");
  const dto = toDto(row, viewer);

  const canSeeParticipants =
    viewer && !viewer.isBlocked && (dto.viewer.isOrganizer || isAdmin(viewer));
  const participantList = canSeeParticipants
    ? await db()
        .select(personFields)
        .from(participants)
        .innerJoin(users, eq(users.id, participants.userId))
        .where(eq(participants.meetupId, id))
        .orderBy(asc(participants.joinedAt))
        .limit(100)
    : null;

  return { ...dto, participants: participantList };
}

export async function createMeetup(user: User, input: z.infer<typeof CreateMeetupSchema>) {
  await requireActiveCategory(input.categoryId);
  const id = await db().transaction(async (tx) => {
    const [meetup] = await tx
      .insert(meetups)
      .values({ ...input, organizerId: user.id })
      .returning({ id: meetups.id });
    // Організатор одразу серед учасників.
    await tx.insert(participants).values({ meetupId: meetup!.id, userId: user.id });
    return meetup!.id;
  });
  return getMeetup(id, user);
}

type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];

/** Блокує рядок вилазки до кінця транзакції, щоб лічильник місць не «поплив». */
async function lockMeetup(tx: Tx, id: string) {
  const [meetup] = await tx.select().from(meetups).where(eq(meetups.id, id)).for("update");
  if (!meetup) throw notFound("Вилазку не знайдено");
  const [taken] = await tx
    .select({ value: count() })
    .from(participants)
    .where(eq(participants.meetupId, id));
  return { meetup, taken: taken?.value ?? 0 };
}

export async function updateMeetup(user: User, id: string, input: z.infer<typeof UpdateMeetupSchema>) {
  await db().transaction(async (tx) => {
    const { meetup, taken } = await lockMeetup(tx, id);
    if (!canManage(user, meetup.organizerId)) throw forbidden("Редагувати може лише організатор");
    if (input.categoryId && input.categoryId !== meetup.categoryId) {
      await requireActiveCategory(input.categoryId);
    }
    if (input.capacity != null && input.capacity < taken) {
      throw conflict(`Уже записалося ${taken} — місць не може бути менше`);
    }
    await tx.update(meetups).set(input).where(eq(meetups.id, id));
  });
  return getMeetup(id, user);
}

async function findMeetup(id: string) {
  const [meetup] = await db().select().from(meetups).where(eq(meetups.id, id));
  if (!meetup) throw notFound("Вилазку не знайдено");
  return meetup;
}

export async function deleteMeetup(user: User, id: string) {
  const meetup = await findMeetup(id);
  if (!canManage(user, meetup.organizerId)) throw forbidden("Видалити може лише організатор");
  await db().delete(meetups).where(eq(meetups.id, id));
}

export async function joinMeetup(user: User, id: string) {
  await db().transaction(async (tx) => {
    const { meetup, taken } = await lockMeetup(tx, id);
    if (meetup.startsAt.getTime() <= Date.now()) throw conflict("Вилазка вже почалася");

    const [already] = await tx
      .select({ userId: participants.userId })
      .from(participants)
      .where(and(eq(participants.meetupId, id), eq(participants.userId, user.id)));
    if (already) return;

    if (meetup.capacity !== null && taken >= meetup.capacity) throw conflict("Вільних місць немає");
    await tx.insert(participants).values({ meetupId: id, userId: user.id });
  });
  return getMeetup(id, user);
}

export async function leaveMeetup(user: User, id: string) {
  const meetup = await findMeetup(id);
  if (meetup.organizerId === user.id) {
    throw conflict("Організатор не може вийти — видали вилазку натомість");
  }
  await db()
    .delete(participants)
    .where(and(eq(participants.meetupId, id), eq(participants.userId, user.id)));
  return getMeetup(id, user);
}
