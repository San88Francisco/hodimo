import { and, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/db";
import { USER_ROLES, type User } from "@/db/schema";
import { isAdmin, isRootAdmin, toUserDto } from "@/lib/auth";
import { conflict, notFound } from "@/lib/http";

const { users, meetups, meetupParticipants: participants } = schema;

export const USER_FILTERS = ["all", "user", "organizer", "admin", "blocked"] as const;

export const ListUsersQuerySchema = z.object({
  q: z.string().trim().max(64).optional(),
  filter: z.enum(USER_FILTERS).default("all"),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const UserPatchSchema = z
  .object({
    role: z.enum(USER_ROLES),
    isBlocked: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Немає полів для оновлення");

export async function listUsers(query: z.infer<typeof ListUsersQuerySchema>) {
  const q = query.q?.replace(/^@/, "");
  // % і _ у запиті — звичайні символи, а не шаблони LIKE.
  const like = q && `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const search = like
    ? or(
        ilike(users.firstName, like),
        ilike(users.lastName, like),
        ilike(users.username, like),
        sql`${users.telegramId}::text = ${q}`,
      )
    : undefined;

  const byFilter = {
    all: undefined,
    user: and(eq(users.role, "user"), eq(users.isBlocked, false)),
    organizer: and(eq(users.role, "organizer"), eq(users.isBlocked, false)),
    admin: eq(users.role, "admin"),
    blocked: eq(users.isBlocked, true),
  }[query.filter];

  const [rows, [counts]] = await Promise.all([
    db()
      .select()
      .from(users)
      .where(and(search, byFilter))
      .orderBy(desc(users.createdAt))
      .limit(query.limit + 1)
      .offset(query.offset),
    // Лічильники для вкладок адмінки (з урахуванням пошуку).
    db()
      .select({
        all: count(),
        user: sql<number>`count(*) filter (where ${users.role} = 'user' and not ${users.isBlocked})::int`,
        organizer: sql<number>`count(*) filter (where ${users.role} = 'organizer' and not ${users.isBlocked})::int`,
        admin: sql<number>`count(*) filter (where ${users.role} = 'admin')::int`,
        blocked: sql<number>`count(*) filter (where ${users.isBlocked})::int`,
      })
      .from(users)
      .where(search),
  ]);

  const hasMore = rows.length > query.limit;
  return {
    items: rows.slice(0, query.limit).map(toUserDto),
    nextOffset: hasMore ? query.offset + query.limit : null,
    counts: counts!,
  };
}

/** Зміна ролі чи блокування. Себе змінювати не можна, щоб випадково не втратити доступ. */
export async function updateUser(admin: User, id: string, patch: z.infer<typeof UserPatchSchema>) {
  if (admin.id === id) throw conflict("Свою роль і статус змінювати не можна");

  const [target] = await db().select().from(users).where(eq(users.id, id));
  if (!target) throw notFound("Користувача не знайдено");
  if (isRootAdmin(target)) {
    throw conflict("Це головний адмін (ADMIN_TELEGRAM_IDS) — його змінюють лише в налаштуваннях сервера");
  }

  const nextRole = patch.role ?? target.role;
  const nextBlocked = patch.isBlocked ?? target.isBlocked;
  if (nextRole === "admin" && nextBlocked) {
    throw conflict(
      target.role === "admin"
        ? "Адміна не можна заблокувати — спершу зніми роль"
        : "Спершу розблокуй користувача",
    );
  }

  const [row] = await db().update(users).set(patch).where(eq(users.id, id)).returning();
  return toUserDto(row!);
}

/**
 * Публічний профіль. Telegram ID і статус блокування бачать лише сам користувач і адміни;
 * лічильники — для всіх (без розкриття, куди саме людина ходить).
 */
export async function getProfile(id: string, viewer: User | null) {
  const [user] = await db().select().from(users).where(eq(users.id, id));
  if (!user) throw notFound("Користувача не знайдено");

  const [[organized], [joined]] = await Promise.all([
    db().select({ value: count() }).from(meetups).where(eq(meetups.organizerId, id)),
    db()
      .select({ value: count() })
      .from(participants)
      .innerJoin(meetups, eq(meetups.id, participants.meetupId))
      .where(and(eq(participants.userId, id), ne(meetups.organizerId, id))),
  ]);

  const canSeePrivate = viewer?.id === id || isAdmin(viewer);
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    photoUrl: user.photoUrl,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    stats: { organized: organized?.value ?? 0, joined: joined?.value ?? 0 },
    isSelf: viewer?.id === id,
    // Приватні поля — null для сторонніх.
    telegramId: canSeePrivate ? user.telegramId : null,
    isBlocked: canSeePrivate ? user.isBlocked : null,
  };
}
