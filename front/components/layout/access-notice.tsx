import Link from "next/link";
import { Ban, Send } from "lucide-react";

import type { Access } from "@/lib/meetups";

/** Пояснення для гостя й заблокованого, чому не можна записатися. */
export function AccessNotice({ access }: { access: Access }) {
  if (access === "user" || access === "admin") return null;

  if (access === "blocked") {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
        <Ban className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>Твій акаунт заблоковано: ти можеш переглядати вилазки, але не записуватись і не створювати.</p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-card p-4 text-sm ring-1 ring-white/5">
      <Send className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-medium">Ти переглядаєш як гість</p>
        <p className="text-muted-foreground">
          Відкрий застосунок у Telegram, щоб записуватись і створювати вилазки.
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
