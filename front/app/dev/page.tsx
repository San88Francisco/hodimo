import { notFound } from "next/navigation";

import { devSignIn, signOut } from "@/app/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMe } from "@/lib/api";

/** Тестові люди. Хто з них адмін — вирішує ADMIN_TELEGRAM_IDS у server/.env. */
const PERSONAS = [
  { telegramId: 900001, firstName: "Андрій", username: "andrii" },
  { telegramId: 900002, firstName: "Оля", username: "olia" },
  { telegramId: 900003, firstName: "Макс" },
];

async function signInById(formData: FormData) {
  "use server";
  const telegramId = Number(formData.get("telegramId"));
  const firstName = String(formData.get("firstName") || "").trim() || "Тестер";
  if (!Number.isInteger(telegramId) || telegramId <= 0) return;
  await devSignIn({ telegramId, firstName });
}

/** Лише в режимі розробки: вхід під різними людьми без Telegram. */
export default async function DevPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const me = await getMe();

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Dev: вхід" back={{ href: "/", label: "Усі вилазки" }} />
      <p className="mb-5 text-sm text-muted-foreground">
        Зараз: {me ? `${me.firstName} (${me.role}${me.isBlocked ? ", заблоковано" : ""})` : "гість"}
      </p>

      <div className="flex flex-col gap-2">
        {PERSONAS.map((person) => (
          <form key={person.telegramId} action={devSignIn.bind(null, person)}>
            <Button
              type="submit"
              variant={me?.telegramId === person.telegramId ? "default" : "secondary"}
              size="lg"
              className="h-12 w-full justify-between rounded-xl px-4 text-base"
            >
              {person.firstName}
              <span className="text-xs opacity-70">ID {person.telegramId}</span>
            </Button>
          </form>
        ))}
      </div>

      <form action={signInById} className="mt-6 flex flex-col gap-2 rounded-2xl bg-card p-4 ring-1 ring-white/5">
        <p className="text-sm font-medium">Увійти за Telegram ID</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Адміном стає ID зі списку ADMIN_TELEGRAM_IDS у server/.env. Якщо ввести свій справжній ID,
          ім&apos;я й фото оновляться з Telegram при наступному відкритті бота.
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

      <form action={signOut} className="mt-4">
        <Button type="submit" variant="ghost" size="lg" className="h-12 w-full rounded-xl text-base">
          Вийти (стати гостем)
        </Button>
      </form>
    </div>
  );
}
