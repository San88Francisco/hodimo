"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import * as api from "@/lib/api";
import { googleImageTarget, isGoogleShareLink, isGoogleUrl } from "@/lib/image-url";
import type { Category, Me, Meetup, MeetupPayload } from "@/lib/meetups";
import { encodeSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export type ActionError = {
  message: string;
  /** Помилки валідації з API: ключ — поле форми. */
  fieldErrors: Record<string, string>;
};

function toActionError(error: unknown): ActionError {
  if (error instanceof api.ApiError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.details ?? []) {
      if (issue.path && !fieldErrors[issue.path]) fieldErrors[issue.path] = issue.message;
    }
    return { message: error.message, fieldErrors };
  }
  console.error(error);
  return { message: "Сервер недоступний. Спробуй ще раз.", fieldErrors: {} };
}

/** Виконує дію з API; повертає помилку або null. */
async function attempt(fn: () => Promise<unknown>): Promise<ActionError | null> {
  try {
    await fn();
    return null;
  } catch (error) {
    return toActionError(error);
  }
}

// ---------- Сесія ----------

async function setSession(initData: string) {
  const forwardedProto = (await headers()).get("x-forwarded-proto");
  (await cookies()).set(
    SESSION_COOKIE,
    encodeSession(initData),
    sessionCookieOptions(forwardedProto === "https"),
  );
}

/** Вхід через Telegram: initData перевіряє API, і лише тоді вони стають сесією. */
export async function signIn(initData: string): Promise<boolean> {
  try {
    await api.verifyInitData(initData);
  } catch {
    return false;
  }
  await setSession(initData);
  return true;
}

function assertDev() {
  if (process.env.NODE_ENV !== "development") throw new Error("Лише в режимі розробки");
}

/**
 * Лише для розробки: вхід під тестовим користувачем без Telegram.
 * Роль і блокування (якщо передані) API виставляє одразу. Лишаємось на тій самій сторінці.
 */
export async function devSignIn(person: api.DevPerson) {
  assertDev();
  const { initData } = await api.devInitData(person);
  await setSession(initData);
  revalidatePath("/", "layout");
}

/** Лише для розробки: стати гостем. */
export async function devSignOut() {
  assertDev();
  (await cookies()).delete(SESSION_COOKIE);
  revalidatePath("/", "layout");
}

// ---------- Події ----------

/**
 * share.google/… → адреса картинки, на яку воно веде; null, якщо там не картинка.
 * Йдемо за редиректами вручну й лише в межах Google, щоб не стукати на довільні адреси.
 */
/** share.google → google.com/imgres?imgurl=… за редиректами (лише в межах Google). */
async function resolveGoogleShare(link: string): Promise<string | null> {
  let url = link;
  try {
    for (let hop = 0; hop < 5; hop++) {
      const response = await fetch(url, {
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location) return null;
      url = new URL(location, url).href;
      const target = googleImageTarget(url);
      if (target) return target;
      if (!isGoogleUrl(url)) return null;
    }
  } catch (error) {
    console.error("resolveGoogleShare", error);
  }
  return null;
}

/**
 * Будь-яке посилання → адреса самої картинки: share.google розгортаємо тут, решту
 * (Pinterest, сторінки сайтів, короткі посилання, пряма картинка) — розпізнає API.
 * null — картинку не знайшли.
 */
export async function resolveImageUrl(link: string): Promise<string | null> {
  if (isGoogleShareLink(link)) {
    const target = await resolveGoogleShare(link);
    if (target) return target;
  }
  try {
    return (await api.resolveImage(link)).imageUrl;
  } catch {
    return null;
  }
}

/** Створює (id = null) або оновлює подію і переходить на її сторінку. */
export async function saveMeetup(id: string | null, payload: MeetupPayload): Promise<ActionError> {
  let meetup: Meetup;
  try {
    meetup = id ? await api.updateMeetup(id, payload) : await api.createMeetup(payload);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/");
  revalidatePath(`/meetups/${meetup.id}`);
  redirect(`/meetups/${meetup.id}`);
}

export async function removeMeetup(id: string): Promise<ActionError> {
  try {
    await api.deleteMeetup(id);
  } catch (error) {
    if (!(error instanceof api.ApiError && error.status === 404)) return toActionError(error);
  }
  revalidatePath("/");
  redirect("/");
}

/** Видалення зі списку (адмін — з картки): лишаємось на тій самій сторінці. */
export async function removeMeetupInPlace(id: string): Promise<ActionError | null> {
  const error = await attempt(() => api.deleteMeetup(id));
  revalidatePath("/");
  revalidatePath("/users/[id]", "page");
  return error;
}

export async function setJoined(id: string, joined: boolean) {
  const error = await attempt(() => (joined ? api.joinMeetup(id) : api.leaveMeetup(id)));
  revalidatePath("/");
  revalidatePath(`/meetups/${id}`);
  return error;
}

// ---------- Модерація ----------

export async function moderateMeetup(id: string, decision: "approve" | "reject", reason?: string) {
  const error = await attempt(() =>
    decision === "approve" ? api.approveMeetup(id) : api.rejectMeetup(id, reason),
  );
  revalidatePath("/", "layout");
  return error;
}

// ---------- Адмінка ----------

export async function addCategory(input: Pick<Category, "name" | "emoji">) {
  const error = await attempt(() => api.createCategory(input));
  revalidatePath("/", "layout");
  return error;
}

export async function editCategory(
  id: string,
  patch: Partial<Pick<Category, "name" | "emoji" | "isArchived">>,
) {
  const error = await attempt(() => api.updateCategory(id, patch));
  revalidatePath("/", "layout");
  return error;
}

export async function removeCategory(id: string) {
  const error = await attempt(() => api.deleteCategory(id));
  revalidatePath("/", "layout");
  return error;
}

export async function reorderCategories(ids: string[]) {
  const error = await attempt(() => api.reorderCategories(ids));
  revalidatePath("/", "layout");
  return error;
}

export async function editUser(id: string, patch: Partial<Pick<Me, "role" | "isBlocked">>) {
  const error = await attempt(() => api.updateUser(id, patch));
  revalidatePath("/admin/users");
  return error;
}
