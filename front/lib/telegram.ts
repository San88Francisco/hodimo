const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me"]);

export function isTelegramLink(url: string) {
  try {
    return TELEGRAM_HOSTS.has(new URL(url).hostname.replace(/^www\./, ""));
  } catch {
    return false;
  }
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
