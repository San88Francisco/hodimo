/**
 * Стартові категорії. Додаються лише в порожню таблицю, тож зміни адміна не перетираються.
 * Запускається разом із міграціями (`npm run db:migrate && npm run db:categories`).
 */
import { count } from "drizzle-orm";

import { db, schema } from "../src/db";

try {
  process.loadEnvFile(".env");
} catch {
  // У Docker змінні вже в середовищі.
}

const DEFAULTS = [
  { name: "Кава", emoji: "☕" },
  { name: "Спорт", emoji: "⚽" },
  { name: "Настолки", emoji: "🎲" },
  { name: "Прогулянки", emoji: "🚶" },
  { name: "Культура", emoji: "🎭" },
  { name: "Інше", emoji: "✨" },
];

async function main() {
  const [existing] = await db().select({ value: count() }).from(schema.categories);
  if (existing && existing.value > 0) {
    console.log(`categories: уже є ${existing.value} — пропускаю`);
    return;
  }
  await db()
    .insert(schema.categories)
    .values(DEFAULTS.map((category, index) => ({ ...category, position: index * 10 })));
  console.log(`categories: додано ${DEFAULTS.length}`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
