import type { Locale } from "@/lib/i18n/config";
import { en } from "@/lib/i18n/dictionaries/en";
import { pl } from "@/lib/i18n/dictionaries/pl";
import { ru } from "@/lib/i18n/dictionaries/ru";
import { uk, type Dictionary } from "@/lib/i18n/dictionaries/uk";

export type { Dictionary };

export const DICTIONARIES: Record<Locale, Dictionary> = { uk, ru, pl, en };
