"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellRing } from "lucide-react";

import { updateNotifications } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { canRequestWriteAccess, requestWriteAccess } from "@/lib/telegram";
import type { Me } from "@/lib/meetups";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "notify:dismissed";

/** Системний діалог Telegram → якщо дозволили, кажемо API, що боту можна писати. */
function useEnableNotifications() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function enable(onDenied?: () => void) {
    setError(null);
    startTransition(async () => {
      if (!(await requestWriteAccess())) return onDenied?.();
      const result = await updateNotifications({ botAccess: true });
      if (result) setError(result.message);
    });
  }

  return { enable, pending, error };
}

/**
 * Плашка на головній: просимо дозвіл, поки бот не може писати людині.
 * Лише в Telegram; «Не зараз» ховає її на цьому пристрої.
 */
export function NotificationsPrompt() {
  const [visible, setVisible] = useState(false);
  const { enable, pending, error } = useEnableNotifications();
  const { t } = useT();

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {}
    // SDK Telegram вантажиться async; до того плашку просто не показуємо.
    const show = () => setVisible(!dismissed && canRequestWriteAccess());
    show();
    const timer = setTimeout(show, 1500);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 text-sm ring-1 ring-white/5">
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="font-medium">{t.notifications.promptTitle}</p>
          <p className="text-muted-foreground">{t.notifications.promptBody}</p>
          {error && <p className="text-destructive">{error}</p>}
        </div>
      </div>
      <div className="flex gap-2 pl-7">
        <Button
          size="lg"
          className="h-9 rounded-full px-4 font-semibold"
          disabled={pending}
          onClick={() => enable(dismiss)}
        >
          {pending ? t.notifications.wait : t.notifications.enable}
        </Button>
        <Button variant="ghost" size="lg" className="h-9 rounded-full px-4" onClick={dismiss}>
          {t.notifications.notNow}
        </Button>
      </div>
    </div>
  );
}

/** Блок «Сповіщення» у власному профілі. */
export function NotificationSettings({ me }: { me: Me }) {
  const { enable, pending: enabling, error } = useEnableNotifications();
  const [saving, startSaving] = useTransition();
  const [inTelegram, setInTelegram] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { t } = useT();

  useEffect(() => {
    const check = () => setInTelegram(canRequestWriteAccess());
    check();
    const timer = setTimeout(check, 1500);
    return () => clearTimeout(timer);
  }, []);

  function toggle() {
    setSaveError(null);
    startSaving(async () => {
      const result = await updateNotifications({ notifyNewMeetups: !me.notifyNewMeetups });
      if (result) setSaveError(result.message);
    });
  }

  const message = error ?? saveError;

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-white/5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
          <Bell className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t.notifications.announcements}</p>
          <p className="text-xs text-muted-foreground">
            {me.botAccess
              ? t.notifications.remindersAlways
              : inTelegram
                ? t.notifications.allowBot
                : t.notifications.openInTelegram}
          </p>
        </div>
        {me.botAccess ? (
          <button
            type="button"
            role="switch"
            aria-checked={me.notifyNewMeetups}
            aria-label={t.notifications.announcements}
            disabled={saving}
            onClick={toggle}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
              me.notifyNewMeetups ? "bg-primary" : "bg-secondary",
            )}
          >
            <span
              className={cn(
                "absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform",
                me.notifyNewMeetups && "translate-x-5",
              )}
            />
          </button>
        ) : (
          inTelegram && (
            <Button
              size="lg"
              className="h-9 shrink-0 rounded-full px-4 font-semibold"
              disabled={enabling}
              onClick={() => enable()}
            >
              {enabling ? "…" : t.notifications.enable}
            </Button>
          )
        )}
      </div>
      {message && <p className="text-sm text-destructive">{message}</p>}
    </section>
  );
}
