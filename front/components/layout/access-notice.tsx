import Link from "next/link";
import { Ban, Send, ShieldQuestion } from "lucide-react";

import type { Access } from "@/lib/meetups";

/**
 * Пояснення, чому дія недоступна: гостю — відкрити в Telegram, заблокованому — що він
 * заблокований, а учаснику на сторінці створення — що це право організаторів.
 */
export function AccessNotice({ access, need = "join" }: { access: Access; need?: "join" | "create" }) {
  if (access === "organizer" || access === "admin") return null;

  if (access === "user") {
    if (need !== "create") return null;
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-card p-4 text-sm ring-1 ring-white/5">
        <ShieldQuestion className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="font-medium">Створювати події можуть організатори</p>
          <p className="text-muted-foreground">
            Попроси адміна видати тобі це право. А поки — записуйся на події інших.
          </p>
        </div>
      </div>
    );
  }

  if (access === "blocked") {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
        <Ban className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>Твій акаунт заблоковано: ти можеш переглядати події, але не записуватись і не створювати.</p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-card p-4 text-sm ring-1 ring-white/5">
      <Send className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-medium">Ти переглядаєш як гість</p>
        <p className="text-muted-foreground">
          Відкрий застосунок у Telegram, щоб записуватись і створювати події.
        </p>
        {process.env.NODE_ENV === "development" && (
          <Link href="/dev" className="mt-1 w-fit text-primary underline-offset-4 hover:underline">
            Dev: увійти як тестовий користувач →
          </Link>
        )}
      </div>
    </div>
  );
}
