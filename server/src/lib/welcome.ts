import { eq } from "drizzle-orm";

import { db, schema } from "@/db";
import { escapeHtml, sendPost } from "@/lib/bot";
import { env } from "@/lib/env";
import type { Locale } from "@/lib/i18n";

/** Привітання на /start: хто такі, і кнопка, що відкриває Mini App. */

const TEXTS: Record<Locale, { hello: string; about: string; cta: string; button: string }> = {
  uk: {
    hello: "Привіт",
    about: "Знаходь людей поруч і збирай компанію на каву, спорт чи настолки.",
    cta: "Тисни кнопку — і ходімо 👇",
    button: "Відкрити Ходімо",
  },
  ru: {
    hello: "Привет",
    about: "Находи людей рядом и собирай компанию на кофе, спорт или настолки.",
    cta: "Жми кнопку — и ходімо 👇",
    button: "Открыть Ходімо",
  },
  pl: {
    hello: "Cześć",
    about: "Znajdź ludzi w pobliżu i zbierz ekipę na kawę, sport czy planszówki.",
    cta: "Kliknij przycisk — i ходімо 👇",
    button: "Otwórz Ходімо",
  },
  en: {
    hello: "Hi",
    about: "Find people nearby and get a group together for coffee, sports or board games.",
    cta: "Tap the button — ходімо 👇",
    button: "Open Ходімо",
  },
};

function toLocale(languageCode: string | undefined): Locale {
  const tag = languageCode?.toLowerCase().split("-")[0];
  return tag === "ru" || tag === "pl" || tag === "en" ? tag : "uk";
}

export type TelegramFrom = { id: number; first_name: string; language_code?: string };

/** Без MINI_APP_URL (локально) бот мовчить. */
export async function sendWelcome(chatId: number, from: TelegramFrom) {
  const url = env().MINI_APP_URL;
  if (!url) return;
  const t = TEXTS[toLocale(from.language_code)];
  await sendPost(chatId, {
    text: [`👋 ${t.hello}, ${escapeHtml(from.first_name)}!`, "", `<b>Ходімо</b> — ${t.about}`, "", t.cta].join("\n"),
    button: { text: t.button, web_app: { url } },
  });
  // Хто натиснув /start, дозволив боту писати — вмикаємо сповіщення, якщо людина вже в базі.
  await db().update(schema.users).set({ botAccess: true }).where(eq(schema.users.telegramId, from.id));
}
