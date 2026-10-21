"use client";

import { ServerCrash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

/** Найчастіше сюди потрапляємо, коли не запущений бекенд (server/, порт 5000). */
export default function Error({ retry }: { error: Error; retry: () => void }) {
  const { t } = useT();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <ServerCrash className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-bold tracking-tight">{t.error.title}</h1>
      <p className="text-sm text-muted-foreground">
        {t.error.body}
      </p>
      <Button size="lg" className="mt-2 h-10 rounded-full px-5 font-semibold" onClick={() => retry()}>
        {t.error.retry}
      </Button>
    </div>
  );
}
