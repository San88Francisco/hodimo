import { notFound } from "next/navigation";

import { devSignIn, devSignOut } from "@/app/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMe } from "@/lib/api";
import { DEV_PERSONAS } from "@/lib/dev-personas";

async function signInById(formData: FormData) {
  "use server";
  const telegramId = Number(formData.get("telegramId"));
  const firstName = String(formData.get("firstName") || "").trim() || "Тестер";
  if (!Number.isInteger(telegramId) || telegramId <= 0) return;
  await devSignIn({ telegramId, firstName });
}

/**
 * Лише в режимі розробки: вхід під різними ролями без Telegram.
 * Те саме є в плаваючій кнопці в кутку будь-якої сторінки.
 */
export default async function DevPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const me = await getMe();

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Dev: вхід" back={{ href: "/", label: "Усі події" }} />
      <p className="mb-5 text-sm text-muted-foreground">
        Зараз: {me ? `${me.firstName} (${me.role}${me.isBlocked ? ", заблоковано" : ""})` : "гість"}
      </p>

      <div className="flex flex-col gap-2">
        {DEV_PERSONAS.map((persona) => (
          <form key={persona.key} action={devSignIn.bind(null, persona)}>
            <Button
              type="submit"
              variant={me?.telegramId === persona.telegramId ? "default" : "secondary"}
              size="lg"
              className="h-12 w-full justify-between rounded-xl px-4 text-base"
            >
              {persona.label}
              <span className="text-xs opacity-70">{persona.firstName}</span>
            </Button>
          </form>
        ))}
        <form action={devSignOut}>
          <Button
            type="submit"
            variant={me ? "secondary" : "default"}
            size="lg"
            className="h-12 w-full justify-between rounded-xl px-4 text-base"
          >
            Гість
            <span className="text-xs opacity-70">без входу</span>
          </Button>
        </form>
      </div>

      <form action={signInById} className="mt-6 flex flex-col gap-2 rounded-2xl bg-card p-4 ring-1 ring-white/5">
        <p className="text-sm font-medium">Увійти за Telegram ID</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Наприклад, свій справжній ID — роль візьметься з бази. Ім&apos;я й фото оновляться з
          Telegram при наступному відкритті бота.
        </p>
        <div className="flex gap-2">
          <Input
            name="telegramId"
            inputMode="numeric"
            placeholder="Telegram ID"
            required
            className="h-11 min-w-0 flex-1 rounded-xl text-base"
          />
          <Input name="firstName" placeholder="Ім'я" className="h-11 w-28 rounded-xl text-base" />
        </div>
        <Button type="submit" size="lg" className="h-11 rounded-xl text-base">
          Увійти
        </Button>
      </form>
    </div>
  );
}
