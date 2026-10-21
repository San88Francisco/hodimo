/** Мови інтерфейсу. Обрана живе в cookie; без неї — мова Telegram або браузера. */
export const LOCALES = ["uk", "ru", "pl", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uk";
export const LOCALE_COOKIE = "lang";

/** Назва мови її ж мовою — для перемикача. */
export const LOCALE_NAMES: Record<Locale, string> = {
  uk: "Українська",
  ru: "Русский",
  pl: "Polski",
  en: "English",
};

/** Коротка позначка на перемикачі. */
export const LOCALE_SHORT: Record<Locale, string> = { uk: "UA", ru: "RU", pl: "PL", en: "EN" };

/** Для Intl: en-GB — «18 October» і 24-годинний час, як звично в Європі. */
export const INTL_LOCALE: Record<Locale, string> = { uk: "uk-UA", ru: "ru-RU", pl: "pl-PL", en: "en-GB" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** «uk-UA», «pl», «RU» → наша мова; null, якщо такої не підтримуємо. */
export function matchLocale(tag: string | null | undefined): Locale | null {
  const primary = tag?.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(primary) ? primary : null;
}

/** Перша підтримувана мова із заголовка Accept-Language (з урахуванням q). */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((param) => param.trim().startsWith("q="));
      return { tag: tag!, q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    const locale = matchLocale(tag);
    if (locale) return locale;
  }
  return null;
}

/** Множина за правилами мови: one / few / many / other. */
export function pluralizer(locale: Locale) {
  const rules = new Intl.PluralRules(INTL_LOCALE[locale]);
  return (count: number, forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }) =>
    forms[rules.select(count)] ?? forms.other;
}
