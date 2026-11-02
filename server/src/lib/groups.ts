import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db, pgCode, schema } from "@/db";
import type { Group } from "@/db/schema";
import { badRequest, conflict, notFound } from "@/lib/http";
import { findMetaContent } from "@/lib/image-resolve";

const { groups } = schema;

const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me"]);

/** `@club`, `t.me/club`, `https://telegram.me/club/` → `https://t.me/club`; null — це не Telegram. */
export function normalizeTelegramUrl(value: string): string | null {
  let link = value.trim();
  if (/^@\w{4,}$/.test(link)) link = `t.me/${link.slice(1)}`;
  if (!/^https?:\/\//i.test(link)) link = `https://${link}`;
  try {
    const url = new URL(link);
    const path = url.pathname.replace(/\/+$/, "");
    if (!TELEGRAM_HOSTS.has(url.hostname.replace(/^www\./, "")) || !path) return null;
    return `https://t.me${path}`;
  } catch {
    return null;
  }
}

const TelegramUrl = z
  .string()
  .trim()
  .max(300, "Максимум 300 символів")
  .transform((value, ctx) => {
    const url = normalizeTelegramUrl(value);
    if (!url) {
      ctx.addIssue({ code: "custom", message: "Потрібне посилання на Telegram-групу (t.me/…)" });
      return z.NEVER;
    }
    return url;
  });

export const GroupInputSchema = z.object({
  url: TelegramUrl,
  /** Порожньо — візьмемо назву з Telegram. */
  name: z.string().trim().max(80, "Максимум 80 символів").optional(),
});

export const GroupPatchSchema = GroupInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Немає полів для оновлення",
);

export function toGroupDto(group: Group) {
  return {
    id: group.id,
    name: group.name,
    url: group.url,
    photoUrl: group.photoUrl,
  };
}

export type GroupDto = ReturnType<typeof toGroupDto>;

export async function listGroups() {
  const rows = await db().select().from(groups).orderBy(asc(groups.name));
  return rows.map(toGroupDto);
}

/** Група, до якої прив'язують подію. */
export async function requireGroup(id: string) {
  const [group] = await db().select().from(groups).where(eq(groups.id, id));
  if (!group) throw conflict("Такої групи немає — обери іншу");
  return group;
}

/**
 * Назва й аватар зі сторінки t.me (вона публічна й для груп за запрошенням).
 * null — Telegram не віддав: посилання неправильне, група без фото чи t.me не відповідає.
 */
async function telegramPreview(url: string): Promise<{ title: string | null; photoUrl: string | null }> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "Mozilla/5.0", "accept-language": "uk,en;q=0.8" },
    });
    if (!response.ok) return { title: null, photoUrl: null };
    const html = await response.text();
    const title = findMetaContent(html, ["og:title"]);
    const image = findMetaContent(html, ["og:image"]);
    return {
      // Неіснуюче чи протерміноване посилання: «Telegram: Contact @…», «Join group chat on Telegram».
      title: title && !/^Telegram: |^Join .+ on Telegram$/.test(title) ? title.slice(0, 80) : null,
      // Без аватара t.me віддає логотип з telegram.org; справжні фото — на CDN telesco.pe.
      photoUrl: image && /^https:\/\/[\w.-]+\.telesco\.pe\//.test(image) ? image : null,
    };
  } catch (error) {
    console.error("telegramPreview", error);
    return { title: null, photoUrl: null };
  }
}

function uniqueUrlGuard(error: unknown): never {
  if (pgCode(error) === "23505") throw conflict("Ця група вже додана");
  throw error;
}

export async function createGroup(input: z.infer<typeof GroupInputSchema>) {
  const preview = await telegramPreview(input.url);
  const name = input.name || preview.title;
  if (!name) throw badRequest("Не вдалося дізнатися назву групи — вкажи її вручну");
  const [row] = await db()
    .insert(groups)
    .values({ url: input.url, name, photoUrl: preview.photoUrl })
    .returning()
    .catch(uniqueUrlGuard);
  return toGroupDto(row!);
}

/** Кожне збереження заново бере аватар з Telegram — так оновлюється й застаріле фото. */
export async function updateGroup(id: string, input: z.infer<typeof GroupPatchSchema>) {
  const [group] = await db().select().from(groups).where(eq(groups.id, id));
  if (!group) throw notFound("Групу не знайдено");
  const url = input.url ?? group.url;
  const moved = url !== group.url;
  const preview = await telegramPreview(url);
  const [row] = await db()
    .update(groups)
    .set({
      url,
      name: input.name || (moved && preview.title) || group.name,
      photoUrl: preview.photoUrl ?? (moved ? null : group.photoUrl),
    })
    .where(eq(groups.id, id))
    .returning()
    .catch(uniqueUrlGuard);
  return toGroupDto(row!);
}

/** Події групи лишаються — просто вже без неї. */
export async function deleteGroup(id: string) {
  const deleted = await db().delete(groups).where(eq(groups.id, id)).returning();
  if (deleted.length === 0) throw notFound("Групу не знайдено");
}
