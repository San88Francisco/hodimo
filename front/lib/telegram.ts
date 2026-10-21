const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me"]);

export function isTelegramLink(url: string) {
  try {
    return TELEGRAM_HOSTS.has(new URL(url).hostname.replace(/^www\./, ""));
  } catch {
    return false;
  }
}

/** Чи можна попросити дозвіл на повідомлення від бота (лише в Telegram, Bot API 6.9+). */
export function canRequestWriteAccess() {
  const webApp = window.Telegram?.WebApp;
  return Boolean(webApp?.initData && webApp.requestWriteAccess && webApp.isVersionAtLeast?.("6.9"));
}

/** Показує системний діалог Telegram; true — людина дозволила (або вже дозволяла раніше). */
export function requestWriteAccess(): Promise<boolean> {
  return new Promise((resolve) => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp?.requestWriteAccess) return resolve(false);
    webApp.requestWriteAccess(resolve);
  });
}

/**
 * Відкриває посилання поза застосунком. У Mini App t.me відкриває сам Telegram (інакше частина
 * клієнтів кидає у браузер), решту — зовнішній браузер чи застосунок. Поза Telegram — нова вкладка.
 */
export function openExternal(url: string) {
  const webApp = window.Telegram?.WebApp;
  if (webApp?.initData) {
    if (isTelegramLink(url) && webApp.openTelegramLink) return webApp.openTelegramLink(url);
    if (!isTelegramLink(url) && webApp.openLink) return webApp.openLink(url);
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
