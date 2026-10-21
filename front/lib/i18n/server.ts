import { cache } from "react";
import { cookies, headers } from "next/headers";

import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  type Locale,
} from "@/lib/i18n/config";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";

/** Мова запиту: обрана (cookie) → мова браузера → українська. Лише на сервері. */
export const getLocale = cache(async (): Promise<Locale> => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return localeFromAcceptLanguage((await headers()).get("accept-language")) ?? DEFAULT_LOCALE;
});

/** Словник для Server Components і Server Actions. */
export async function getT() {
  const locale = await getLocale();
  return { locale, t: DICTIONARIES[locale] };
}
