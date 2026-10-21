"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { setLocale } from "@/app/actions";
import { useT } from "@/lib/i18n/client";
import { LOCALE_NAMES, LOCALE_SHORT, LOCALES } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/** Мова інтерфейсу: UA · RU · PL · EN. Вибір зберігається в cookie на рік. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="radiogroup"
      aria-label={t.language.label}
      className={cn("flex rounded-full bg-secondary/60 p-0.5 ring-1 ring-white/5", pending && "opacity-60", className)}
    >
      {LOCALES.map((item) => {
        const active = item === locale;
        return (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={active}
            lang={item}
            aria-label={LOCALE_NAMES[item]}
            title={LOCALE_NAMES[item]}
            disabled={pending}
            onClick={() => {
              if (active) return;
              startTransition(async () => {
                await setLocale(item);
                router.refresh();
              });
            }}
            className={cn(
              "h-8 flex-1 rounded-full px-2.5 text-xs font-semibold transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {LOCALE_SHORT[item]}
          </button>
        );
      })}
    </div>
  );
}
