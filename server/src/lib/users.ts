import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/db";
import { USER_ROLES, type User } from "@/db/schema";
import { toUserDto } from "@/lib/auth";
import { conflict, notFound } from "@/lib/http";

const { users } = schema;

export const ListUsersQuerySchema = z.object({
  q: z.string().trim().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
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

  const rows = await db()
    .select()
    .from(users)
    .where(search)
    .orderBy(desc(users.createdAt))
    .limit(query.limit + 1)
    .offset(query.offset);

  const hasMore = rows.length > query.limit;
  return {
    items: rows.slice(0, query.limit).map(toUserDto),
    nextOffset: hasMore ? query.offset + query.limit : null,
  };
}

/** Зміна ролі чи блокування. Себе змінювати не можна, щоб випадково не втратити доступ. */
export async function updateUser(admin: User, id: string, patch: z.infer<typeof UserPatchSchema>) {
  if (admin.id === id) throw conflict("Свою роль і статус змінювати не можна");

  const [target] = await db().select().from(users).where(eq(users.id, id));
  if (!target) throw notFound("Користувача не знайдено");

  const nextRole = patch.role ?? target.role;
  if (patch.isBlocked && nextRole === "admin") {
    throw conflict("Адміна не можна заблокувати — спершу зніми роль");
  }

  const [row] = await db().update(users).set(patch).where(eq(users.id, id)).returning();
  return toUserDto(row!);
}
