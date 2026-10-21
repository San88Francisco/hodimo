"use client";

import { createContext, useContext } from "react";

import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Мову визначає сервер (root layout) — клієнтські компоненти беруть її звідси. */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Словник для клієнтських компонентів. */
export function useT() {
  const locale = useContext(LocaleContext);
  return { locale, t: DICTIONARIES[locale] };
}
