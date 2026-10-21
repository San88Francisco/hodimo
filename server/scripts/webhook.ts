/**
 * Підключає вебхук бота до сервера: Telegram почне слати оновлення на /api/telegram/webhook.
 *
 *   npm run -s tg:webhook -- --server https://<сервер>.vercel.app
 *
 * Бере TELEGRAM_BOT_TOKEN і TELEGRAM_WEBHOOK_SECRET з .env (або середовища) — ті самі, що на Vercel.
 * Достатньо запустити один раз (і знову, якщо змінилась адреса сервера чи секрет).
 */
import { parseArgs } from "node:util";

try {
  process.loadEnvFile(".env");
} catch {
  // Змінні вже в середовищі.
}

const { values } = parseArgs({ options: { server: { type: "string" } } });

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
if (!token || !secret || !values.server) {
  console.error("Потрібні TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET і --server https://…");
  process.exit(1);
}

const url = new URL("/api/telegram/webhook", values.server).href;
const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ url, secret_token: secret, allowed_updates: ["message"], drop_pending_updates: true }),
});
const body = (await response.json()) as { ok: boolean; description?: string };
console.log(body.ok ? `Вебхук: ${url}` : `Помилка: ${body.description}`);
process.exit(body.ok ? 0 : 1);
