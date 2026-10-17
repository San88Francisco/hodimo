/**
 * Генерує initData, підписані TELEGRAM_BOT_TOKEN, — щоб тестувати API без Telegram.
 *
 *   npm run -s tg:init-data -- --id 900001 --name Андрій --username andrii
 *
 * Результат передавай як заголовок `Authorization: tma <initData>`.
 * З `--url` друкує посилання на фронт, яке відкриває застосунок так, ніби його запустив Telegram
 * (SDK telegram-web-app.js читає initData з #tgWebAppData).
 */
import { parseArgs } from "node:util";

import { signInitData } from "../src/lib/telegram";

try {
  process.loadEnvFile(".env");
} catch {
  // У Docker змінні вже в середовищі.
}

const { values } = parseArgs({
  options: {
    id: { type: "string", default: "900001" },
    name: { type: "string", default: "Тестер" },
    username: { type: "string" },
    url: { type: "boolean", default: false },
    front: { type: "string", default: "http://localhost:3000" },
  },
});

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  console.error("TELEGRAM_BOT_TOKEN не задано (.env)");
  process.exit(1);
}

const initData = signInitData(
  { id: Number(values.id), first_name: values.name!, username: values.username },
  botToken,
);

if (values.url) {
  const hash = new URLSearchParams({
    tgWebAppData: initData,
    tgWebAppVersion: "8.0",
    tgWebAppPlatform: "web",
  });
  console.log(`${values.front}/#${hash}`);
} else {
  console.log(initData);
}
