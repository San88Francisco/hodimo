import { asc, count, eq, max } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/db";
import type { Category } from "@/db/schema";
import { conflict, notFound } from "@/lib/http";

const { categories, meetups } = schema;

export const CategoryInputSchema = z.object({
  name: z.string().trim().min(2, "Мінімум 2 символи").max(40, "Максимум 40 символів"),
  emoji: z.string().trim().min(1, "Додай емодзі").max(16),
  position: z.number().int().min(0).max(1000).optional(),
  isArchived: z.boolean().optional(),
});

export const CategoryPatchSchema = CategoryInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Немає полів для оновлення",
);

/** Новий порядок: id у тому порядку, як їх показувати. */
export const CategoryOrderSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(200),
});

export function toCategoryDto(category: Category) {
  return {
    id: category.id,
    name: category.name,
    emoji: category.emoji,
    position: category.position,
    isArchived: category.isArchived,
  };
}

export type CategoryDto = ReturnType<typeof toCategoryDto>;

/** Активні категорії (або всі — для адмінки). */
export async function listCategories({ includeArchived = false } = {}) {
  const rows = await db()
    .select()
    .from(categories)
    .where(includeArchived ? undefined : eq(categories.isArchived, false))
    .orderBy(asc(categories.position), asc(categories.name));
  return rows.map(toCategoryDto);
}

/** Категорія, у яку можна додати подію. */
export async function requireActiveCategory(id: string) {
  const [category] = await db().select().from(categories).where(eq(categories.id, id));
  if (!category || category.isArchived) throw conflict("Такої категорії немає — обери іншу");
  return category;
}

/** Drizzle загортає помилку Postgres у DrizzleQueryError, оригінал — у cause. */
function pgCode(error: unknown): string | undefined {
  const err = error as { code?: string; cause?: { code?: string } } | undefined;
  return err?.code ?? err?.cause?.code;
}

function uniqueNameGuard(error: unknown): never {
  if (pgCode(error) === "23505") throw conflict("Категорія з такою назвою вже є");
  throw error;
}

export async function createCategory(input: z.infer<typeof CategoryInputSchema>) {
  // Нова категорія — у кінець списку.
  const [last] = await db().select({ value: max(categories.position) }).from(categories);
  const position = input.position ?? (last?.value ?? -10) + 10;
  const [row] = await db()
    .insert(categories)
    .values({ ...input, position })
    .returning()
    .catch(uniqueNameGuard);
  return toCategoryDto(row!);
}

export async function updateCategory(id: string, input: z.infer<typeof CategoryPatchSchema>) {
  const [row] = await db()
    .update(categories)
    .set(input)
    .where(eq(categories.id, id))
    .returning()
    .catch(uniqueNameGuard);
  if (!row) throw notFound("Категорію не знайдено");
  return toCategoryDto(row);
}

/** Перетягування в адмінці: позиції 0, 10, 20… за порядком id (з кроком — щоб нові лягали в кінець). */
export async function reorderCategories({ ids }: z.infer<typeof CategoryOrderSchema>) {
  await db().transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(categories).set({ position: index * 10 }).where(eq(categories.id, id));
    }
  });
  return listCategories({ includeArchived: true });
}

export async function deleteCategory(id: string) {
  const [used] = await db()
    .select({ value: count() })
    .from(meetups)
    .where(eq(meetups.categoryId, id));
  if (used && used.value > 0) {
    throw conflict(`У категорії є події (${used.value}) — її можна лише архівувати`);
  }
  const deleted = await db().delete(categories).where(eq(categories.id, id)).returning();
  if (deleted.length === 0) throw notFound("Категорію не знайдено");
}
