import Link from "next/link";
import { Ban, Send } from "lucide-react";

import { getT } from "@/lib/i18n/server";
import type { Access } from "@/lib/meetups";

/** Пояснення для гостя й заблокованого, чому не можна записатися чи створити подію. */
export async function AccessNotice({ access }: { access: Access }) {
  if (access === "user" || access === "admin") return null;
  const { t } = await getT();

  if (access === "blocked") {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
        <Ban className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>{t.access.blockedNotice}</p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-card p-4 text-sm ring-1 ring-white/5">
      <Send className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-medium">{t.access.guestTitle}</p>
        <p className="text-muted-foreground">{t.access.openInTelegram}</p>
        {process.env.NODE_ENV === "development" && (
          <Link href="/dev" className="mt-1 w-fit text-primary underline-offset-4 hover:underline">
            {t.access.devLogin}
          </Link>
        )}
      </div>
    </div>
  );
}
