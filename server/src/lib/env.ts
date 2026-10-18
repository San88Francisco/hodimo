import { z } from "zod";

const commaList = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

const EnvSchema = z.object({
  DATABASE_URL: z.url(),
  DB_POOL_MAX: z.coerce.number().int().positive().default(5),
  APP_TIMEZONE: z.string().default("Europe/Warsaw"),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  INITDATA_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(86_400),
  /** Telegram ID, які завжди отримують роль admin. */
  ADMIN_TELEGRAM_IDS: commaList.pipe(z.array(z.string().regex(/^\d+$/).transform(Number))),
  /** Vercel Cron надсилає `Authorization: Bearer <CRON_SECRET>`; без нього cron-маршрути закриті на проді. */
  CRON_SECRET: z.string().min(16).optional(),
  /** Лише для локальної розробки: POST /api/dev/init-data видає підписані initData. */
  DEV_LOGIN: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

/** Змінні середовища читаються ліниво, щоб `next build` не вимагав секретів. */
export function env(): Env {
  if (!cached) {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Некоректні змінні середовища:\n${z.prettifyError(parsed.error)}`);
    }
    cached = parsed.data;
  }
  return cached;
}
