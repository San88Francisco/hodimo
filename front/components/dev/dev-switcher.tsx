"use client";

import { useState, useTransition } from "react";
import { Check, LoaderCircle, UserRoundCog } from "lucide-react";
import { useRouter } from "next/navigation";

import { devSignIn, devSignOut } from "@/app/actions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DEV_PERSONAS } from "@/lib/dev-personas";
import type { Me } from "@/lib/meetups";
import { cn } from "@/lib/utils";

/**
 * Лише в режимі розробки: плаваюча кнопка для миттєвого перемикання ролей
 * на поточній сторінці (без Telegram і без переходів).
 */
export function DevSwitcher({ me }: { me: Me | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const current = me
    ? DEV_PERSONAS.find((persona) => persona.telegramId === me.telegramId)?.key ?? "other"
    : "guest";

  function switchTo(action: () => Promise<void>) {
    startTransition(async () => {
      await action();
      router.refresh();
      // Закриваємо меню, щоб одразу побачити сторінку очима нової ролі.
      setOpen(false);
    });
  }

  const options = [
    ...DEV_PERSONAS.map((persona) => ({
      key: persona.key,
      title: persona.label,
      hint: persona.firstName,
      run: () => devSignIn(persona),
    })),
    { key: "guest", title: "Гість", hint: "без входу", run: devSignOut },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Dev: змінити роль"
        className={cn(
          "fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] z-50 grid size-11 place-items-center rounded-full",
          "border border-dashed border-amber-400/70 bg-background/90 text-amber-300 shadow-lg shadow-black/40 backdrop-blur",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring lg:bottom-6",
        )}
      >
        {pending ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
        ) : (
          <UserRoundCog className="size-5" aria-hidden />
        )}
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={10}
        className="w-64 gap-1 rounded-2xl bg-card p-2 ring-white/10 shadow-xl shadow-black/40"
      >
        <p className="px-2.5 pt-1 pb-1.5 text-xs font-medium text-amber-300">
          DEV · зайти як
          {current === "other" && me && (
            <span className="text-muted-foreground"> (зараз: {me.firstName})</span>
          )}
        </p>
        {options.map((option) => {
          const active = option.key === current;
          return (
            <button
              key={option.key}
              type="button"
              disabled={pending}
              onClick={() => switchTo(option.run)}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-2.5 text-left outline-none transition-colors",
                "hover:bg-secondary focus-visible:bg-secondary disabled:opacity-60",
                active && "bg-secondary",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] leading-tight font-medium">{option.title}</span>
                <span className="block text-xs text-muted-foreground">{option.hint}</span>
              </span>
              {active && <Check className="size-4 text-primary" aria-hidden />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
