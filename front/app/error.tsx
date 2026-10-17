"use client";

import { ServerCrash } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Найчастіше сюди потрапляємо, коли не запущений бекенд (server/, порт 5000). */
export default function Error({ retry }: { error: Error; retry: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <ServerCrash className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-bold tracking-tight">Не вдалося завантажити події</h1>
      <p className="text-sm text-muted-foreground">
        Сервер не відповідає. Перевір, що бекенд запущений, і спробуй ще раз.
      </p>
      <Button size="lg" className="mt-2 h-10 rounded-full px-5 font-semibold" onClick={() => retry()}>
        Спробувати ще раз
      </Button>
    </div>
  );
}
