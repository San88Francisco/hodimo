"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { removeMeetupInPlace } from "@/app/actions";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Кнопка видалення на обкладинці картки (для адміна): спершу питає, потім видаляє. */
export function CardDeleteButton({ meetupId, className }: { meetupId: string; className?: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { t } = useT();

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await removeMeetupInPlace(meetupId);
      if (result) setError(result.message);
      else setConfirming(false);
    });
  }

  // z-10 — над «розтягнутим» посиланням картки.
  if (!confirming) {
    return (
      <button
        type="button"
        aria-label={t.card.deleteMeetup}
        onClick={() => setConfirming(true)}
        className={cn(
          "z-10 grid size-9 place-items-center rounded-full bg-black/65 text-white backdrop-blur-sm outline-none hover:bg-destructive focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "z-10 flex items-center gap-1 rounded-full bg-black/75 p-1 pl-3 text-xs font-medium text-white backdrop-blur-sm",
        className,
      )}
    >
      <span role={error ? "alert" : undefined} className={cn(error && "text-red-300")}>
        {error ?? t.card.deleteConfirm}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        className="h-7 rounded-full px-2.5 hover:bg-white/10 disabled:opacity-50"
      >
        {t.common.no}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={remove}
        className="h-7 rounded-full bg-destructive px-3 hover:bg-destructive/90 disabled:opacity-50"
      >
        {pending ? t.common.deleting : t.common.yes}
      </button>
    </div>
  );
}
