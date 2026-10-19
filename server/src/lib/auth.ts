import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { env } from "@/lib/env";
import { forbidden, HttpError, unauthorized } from "@/lib/http";
import { validateInitData } from "@/lib/telegram";

/**
 * Ролі:
 * - гість — немає заголовка Authorization: лише перегляд;
 * - user — відкрив Mini App у Telegram: записується на події й пропонує свої (через модерацію);
 * - admin — модерує події й керує будь-якими подіями та користувачами.
 * Заблокований користувач не бачить подій і профілів і нічого не може змінювати
 * (лише /api/me, щоб клієнт знав про блокування).
 *
 * Клієнт надсилає `Authorization: tma <initData>` (сирий `Telegram.WebApp.initData`).
 */
function readInitData(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, ...rest] = header.split(" ");
  if (scheme?.toLowerCase() !== "tma" || rest.length === 0) {
    throw unauthorized("Очікується заголовок Authorization: tma <initData>");
  }
  return rest.join(" ");
}

async function authenticate(initData: string): Promise<User> {
  const config = env();
  const result = validateInitData(initData, config.TELEGRAM_BOT_TOKEN, config.INITDATA_MAX_AGE_SECONDS);
  if (!result.ok) throw unauthorized(result.reason);

  const { user } = result;
  const profile = {
    firstName: user.first_name,
    lastName: user.last_name ?? null,
    username: user.username ?? null,
    photoUrl: user.photo_url ?? null,
  };
  const isAdmin = config.ADMIN_TELEGRAM_IDS.includes(user.id);

  const [row] = await db()
    .insert(schema.users)
    .values({ telegramId: user.id, ...profile, role: isAdmin ? "admin" : "user" })
    .onConflictDoUpdate({
      target: schema.users.telegramId,
      set: { ...profile, ...(isAdmin && { role: "admin" as const }) },
    })
    .returning();
  return row!;
}

/** Користувач або 401. */
export async function requireUser(request: Request): Promise<User> {
  const initData = readInitData(request);
  if (!initData) throw unauthorized();
  return authenticate(initData);
}

/** Користувач, який може щось змінювати (не заблокований), або 401/403. */
export async function requireActiveUser(request: Request): Promise<User> {
  const user = await requireUser(request);
  if (user.isBlocked) throw forbidden("Твій акаунт заблоковано");
  return user;
}

export async function requireAdmin(request: Request): Promise<User> {
  const user = await requireActiveUser(request);
  if (user.role !== "admin") throw forbidden("Лише для адміністраторів");
  return user;
}

/** Для публічних маршрутів перегляду: гість або активний користувач; заблокованому — 403. */
export async function viewer(request: Request): Promise<User | null> {
  const user = await optionalUser(request);
  if (user?.isBlocked) throw forbidden("Твій акаунт заблоковано");
  return user;
}

/** Для публічних маршрутів: прострочені чи биті initData = гість, а не помилка. */
export async function optionalUser(request: Request): Promise<User | null> {
  try {
    const initData = readInitData(request);
    return initData ? await authenticate(initData) : null;
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) return null;
    throw error;
  }
}

export function isAdmin(user: User | null): boolean {
  return user?.role === "admin" && !user.isBlocked;
}

/** Адміни з ADMIN_TELEGRAM_IDS — власники: їхню роль і статус в адмінці змінити не можна. */
export function isRootAdmin(user: Pick<User, "telegramId">) {
  return env().ADMIN_TELEGRAM_IDS.includes(user.telegramId);
}

export function toUserDto(user: User) {
  return {
    id: user.id,
    telegramId: user.telegramId,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    photoUrl: user.photoUrl,
    role: user.role,
    isBlocked: user.isBlocked,
    isRootAdmin: isRootAdmin(user),
    createdAt: user.createdAt.toISOString(),
  };
}
