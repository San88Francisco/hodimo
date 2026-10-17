"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { signIn } from "@/app/actions";

export const TELEGRAM_SDK_URL = "https://telegram.org/js/telegram-web-app.js";

type TelegramWebApp = {
  initData: string;
  initDataUnsafe: { user?: { id: number } };
  ready: () => void;
  expand: () => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

/** SDK вантажиться async, тож чекаємо його (або здаємось, якщо він не завантажився). */
function whenSdkReady(): Promise<TelegramWebApp | undefined> {
  if (window.Telegram?.WebApp) return Promise.resolve(window.Telegram.WebApp);
  const script = document.querySelector<HTMLScriptElement>(`script[src="${TELEGRAM_SDK_URL}"]`);
  if (!script) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const done = () => resolve(window.Telegram?.WebApp);
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", done, { once: true });
  });
}

const SENT_KEY = "tma:sent";

/**
 * Якщо сторінку відкрито в Telegram, передає свіжі initData на сервер (cookie-сесія)
 * і перемальовує сторінку вже від імені користувача. Поза Telegram нічого не робить.
 */
export function TelegramInit({ signedInTelegramId }: { signedInTelegramId: number | null }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    void whenSdkReady().then((webApp) => {
      if (cancelled || !webApp?.initData) return;
      webApp.ready();
      webApp.expand();

      const telegramId = webApp.initDataUnsafe.user?.id ?? null;
      let alreadySent = false;
      try {
        alreadySent = sessionStorage.getItem(SENT_KEY) === webApp.initData;
      } catch {}
      if (alreadySent && signedInTelegramId === telegramId) return;

      void signIn(webApp.initData).then((ok) => {
        if (!ok || cancelled) return;
        try {
          sessionStorage.setItem(SENT_KEY, webApp.initData);
        } catch {}
        if (signedInTelegramId !== telegramId) router.refresh();
      });
    });

    return () => {
      cancelled = true;
    };
  }, [router, signedInTelegramId]);

  return null;
}
