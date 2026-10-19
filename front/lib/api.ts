import { cache } from "react";
import { cookies } from "next/headers";

import type { Category, Me, Meetup, MeetupPayload, Profile, Role } from "@/lib/meetups";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";

/** Викликається лише на сервері (Server Components і Server Actions). */
const API_URL = process.env.API_URL ?? "http://localhost:5000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

type Page<T> = { items: T[]; nextOffset: number | null };

async function request<T>(
  path: string,
  init: RequestInit & { initData?: string } = {},
): Promise<T> {
  const { initData = decodeSession((await cookies()).get(SESSION_COOKIE)?.value), ...rest } = init;
  const response = await fetch(`${API_URL}/api${path}`, {
    cache: "no-store",
    ...rest,
    headers: {
      "content-type": "application/json",
      ...(initData && { authorization: `tma ${initData}` }),
      ...rest.headers,
    },
  });
  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? "unknown",
      body?.error?.message ?? `API відповів ${response.status}`,
      body?.error?.details,
    );
  }
  return body as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

// ---------- Користувач ----------

/** Поточний користувач або null (гість чи прострочена сесія). Один запит на рендер. */
export const getMe = cache(async (): Promise<Me | null> => {
  if (!(await cookies()).get(SESSION_COOKIE)) return null;
  try {
    return await request<Me>("/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    // getMe кличе root layout, де error.tsx не спрацює. Якщо API лежить —
    // показуємо гостя, а помилку побачить сама сторінка.
    if (!(error instanceof ApiError)) {
      console.error("getMe: API недоступний", error);
      return null;
    }
    throw error;
  }
});

/** Перевіряє initData на API, не чіпаючи cookie. */
export function verifyInitData(initData: string) {
  return request<Me>("/me", { initData });
}

export type DevPerson = {
  telegramId: number;
  firstName: string;
  username?: string;
  role?: Role;
  isBlocked?: boolean;
};

/** Лише для розробки (DEV_LOGIN=true на API). */
export function devInitData(person: DevPerson) {
  return request<{ initData: string }>("/dev/init-data", json("POST", person));
}

/** Профіль будь-якого користувача; null, якщо такого немає. */
export async function getProfile(id: string) {
  try {
    return await request<Profile>(`/users/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}

// ---------- Категорії ----------

export const listCategories = cache(async (includeArchived = false) => {
  const { items } = await request<{ items: Category[] }>(`/categories${includeArchived ? "?all=1" : ""}`);
  return items;
});

export function createCategory(input: Pick<Category, "name" | "emoji">) {
  return request<Category>("/categories", json("POST", input));
}

export function updateCategory(id: string, patch: Partial<Pick<Category, "name" | "emoji" | "isArchived">>) {
  return request<Category>(`/categories/${encodeURIComponent(id)}`, json("PATCH", patch));
}

export function deleteCategory(id: string) {
  return request<void>(`/categories/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ---------- Події ----------

export function listMeetups(query: Record<string, string> = {}) {
  const params = new URLSearchParams({ limit: "50", ...query });
  return request<Page<Meetup>>(`/meetups?${params}`);
}

/** null, якщо події немає (або id некоректний). */
export async function getMeetup(id: string) {
  try {
    return await request<Meetup>(`/meetups/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}

export function createMeetup(payload: MeetupPayload) {
  return request<Meetup>("/meetups", json("POST", payload));
}

export function updateMeetup(id: string, payload: Partial<MeetupPayload>) {
  return request<Meetup>(`/meetups/${encodeURIComponent(id)}`, json("PATCH", payload));
}

export function deleteMeetup(id: string) {
  return request<void>(`/meetups/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function joinMeetup(id: string) {
  return request<Meetup>(`/meetups/${encodeURIComponent(id)}/join`, { method: "POST" });
}

export function leaveMeetup(id: string) {
  return request<Meetup>(`/meetups/${encodeURIComponent(id)}/join`, { method: "DELETE" });
}

// ---------- Модерація (адмін) ----------

export function approveMeetup(id: string) {
  return request<Meetup>(`/meetups/${encodeURIComponent(id)}/approve`, { method: "POST" });
}

export function rejectMeetup(id: string, reason?: string) {
  return request<Meetup>(`/meetups/${encodeURIComponent(id)}/reject`, json("POST", { reason }));
}

/** Лічильник черги модерації для меню; 0, якщо щось пішло не так (не ламаємо сторінку). */
export const getPendingCount = cache(async () => {
  try {
    const { pendingMeetups } = await request<{ pendingMeetups: number }>("/admin/summary");
    return pendingMeetups;
  } catch {
    return 0;
  }
});

// ---------- Адмінка ----------

export const USER_FILTERS = ["all", "user", "admin", "blocked"] as const;
export type UserFilter = (typeof USER_FILTERS)[number];

export function listUsers({
  q,
  filter = "all",
  limit = 50,
}: { q?: string; filter?: UserFilter; limit?: number } = {}) {
  const params = new URLSearchParams({ filter, limit: String(limit), ...(q && { q }) });
  return request<Page<Me> & { counts: Record<UserFilter, number> }>(`/admin/users?${params}`);
}

export function updateUser(id: string, patch: Partial<Pick<Me, "role" | "isBlocked">>) {
  return request<Me>(`/admin/users/${encodeURIComponent(id)}`, json("PATCH", patch));
}
