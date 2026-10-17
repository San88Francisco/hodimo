import { Ban } from "lucide-react";

import { PersonAvatar } from "@/components/meetups/meetup-cover";
import { fullName, type Me } from "@/lib/meetups";

/** Заблокований не бачить подій: замість будь-якої сторінки — це. */
export function BlockedScreen({ me }: { me: Me }) {
  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="relative">
        <PersonAvatar person={me} className="size-20 text-2xl opacity-60" />
        <span className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full bg-destructive text-white ring-4 ring-background">
          <Ban className="size-4" aria-hidden />
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-bold tracking-tight">Акаунт заблоковано</h1>
        <p className="text-sm text-muted-foreground">{fullName(me)}</p>
      </div>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        Адміністратор обмежив тобі доступ до подій. Якщо це помилка — напиши адміністраторам.
      </p>
    </div>
  );
}
