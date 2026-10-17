import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/*
 * RLS увімкнено на всіх таблицях і без політик: публічний Data API Supabase (REST з
 * publishable-ключем) не бачить нічого. Наш API ходить як власник таблиць, на нього RLS не діє.
 */

/**
 * user — записується на події; organizer — ще й створює їх (право видає адмін);
 * admin — керує всім. Блокування — окремий прапорець поверх будь-якої ролі.
 */
export const USER_ROLES = ["user", "organizer", "admin"] as const;

export const userRole = pgEnum("user_role", USER_ROLES);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Користувачі з'являються автоматично при першому відкритті Mini App у Telegram. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // ID Telegram вміщується в 52 біти, тож number безпечний.
  telegramId: bigint("telegram_id", { mode: "number" }).notNull().unique(),
  firstName: varchar("first_name", { length: 128 }).notNull(),
  lastName: varchar("last_name", { length: 128 }),
  username: varchar("username", { length: 64 }),
  photoUrl: text("photo_url"),
  role: userRole("role").notNull().default("user"),
  isBlocked: boolean("is_blocked").notNull().default(false),
  ...timestamps,
}).enableRLS();

/** Категорії веде адмін. Архівна категорія зникає з форми й фільтрів, але старі події її зберігають. */
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 40 }).notNull().unique(),
  emoji: varchar("emoji", { length: 16 }).notNull(),
  position: integer("position").notNull().default(0),
  isArchived: boolean("is_archived").notNull().default(false),
  ...timestamps,
}).enableRLS();

export const meetups = pgTable(
  "meetups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 80 }).notNull(),
    description: text("description").notNull().default(""),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    /** null — без обмежень. */
    capacity: integer("capacity"),
    city: varchar("city", { length: 80 }).notNull(),
    place: varchar("place", { length: 120 }).notNull(),
    imageUrl: text("image_url"),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    index("meetups_starts_at_idx").on(table.startsAt),
    index("meetups_organizer_idx").on(table.organizerId),
    index("meetups_category_idx").on(table.categoryId),
    check(
      "meetups_capacity_check",
      sql`${table.capacity} is null or ${table.capacity} between 2 and 100`,
    ),
  ],
).enableRLS();

export const meetupParticipants = pgTable(
  "meetup_participants",
  {
    meetupId: uuid("meetup_id")
      .notNull()
      .references(() => meetups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.meetupId, table.userId] }),
    index("meetup_participants_user_idx").on(table.userId),
  ],
).enableRLS();

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Meetup = typeof meetups.$inferSelect;
export type UserRole = (typeof USER_ROLES)[number];
