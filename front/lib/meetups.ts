// ---------- Типи API (`server/`) ----------

export type Person = {
  id: string;
  firstName: string;
  username: string | null;
  photoUrl: string | null;
};

export type Role = "user" | "admin";

/** pending — на розгляді; approved — бачать усі; rejected — відхилена, лише в історії автора. */
export type MeetupStatus = "pending" | "approved" | "rejected";

export type Me = Person & {
  telegramId: number;
  lastName: string | null;
  role: Role;
  isBlocked: boolean;
  /** Адмін з ADMIN_TELEGRAM_IDS на сервері: в адмінці не змінюється. */
  isRootAdmin: boolean;
  createdAt: string;
};

/** Публічний профіль. telegramId і isBlocked — null, якщо дивиться не сам користувач і не адмін. */
export type Profile = Person & {
  lastName: string | null;
  role: Role;
  createdAt: string;
  stats: { organized: number; joined: number };
  isSelf: boolean;
  telegramId: number | null;
  isBlocked: boolean | null;
};

export type Category = {
  id: string;
  name: string;
  emoji: string;
  position: number;
  isArchived: boolean;
};

export type Meetup = {
  id: string;
  title: string;
  description: string;
  category: Category;
  /** ISO 8601, UTC. */
  startsAt: string;
  /** null — без обмежень. */
  capacity: number | null;
  attendeesCount: number;
  isFull: boolean;
  /** Час старту вже настав: подія неактивна, лишається лише в історії. */
  isPast: boolean;
  status: MeetupStatus;
  /** Причина відхилення — приходить лише автору й адмінам. */
  rejectReason: string | null;
  city: string;
  place: string;
  /** Точка на карті, якщо організатор її позначив. */
  location: GeoPoint | null;
  imageUrl: string | null;
  /** Чат події (Telegram-група тощо). */
  groupUrl: string | null;
  organizer: Person;
  viewer: { isJoined: boolean; isOrganizer: boolean; canManage: boolean };
  /** Активної події — усім; іншої — лише організатору й адмінам, решті null. */
  participants?: Person[] | null;
  createdAt: string;
};

/** Тіло POST / PATCH /api/meetups. */
export type MeetupPayload = {
  title: string;
  description: string;
  categoryId: string;
  startsAt: string;
  capacity: number | null;
  city: string;
  place: string;
  /** Посилання на картинку з інтернету — сам файл ми не зберігаємо. */
  imageUrl: string | null;
  location: GeoPoint | null;
  groupUrl: string | null;
};

export type GeoPoint = { lat: number; lng: number };

/** Відкриває точку в Google Картах — застосунком на телефоні або в браузері. */
export function mapsUrl({ lat, lng }: GeoPoint) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** `t.me/club`, `@club` → `https://t.me/club`; решту лишаємо як є. */
export function normalizeGroupUrl(value: string) {
  const link = value.trim();
  if (/^@[\w]{4,}$/.test(link)) return `https://t.me/${link.slice(1)}`;
  if (/^(t\.me|telegram\.me|chat\.whatsapp\.com)\//i.test(link)) return `https://${link}`;
  return link;
}

/** Що поточний відвідувач може робити. */
export type Access = "guest" | "blocked" | Role;

export function accessOf(me: Me | null): Access {
  if (!me) return "guest";
  if (me.isBlocked) return "blocked";
  return me.role;
}

/** Створювати події може будь-хто, хто увійшов і не заблокований (події користувачів — через модерацію). */
export function canCreateMeetups(access: Access) {
  return access === "user" || access === "admin";
}

export const ROLE_LABEL: Record<Role, string> = {
  user: "Користувач",
  admin: "Адмін",
};

export const STATUS_LABEL: Record<MeetupStatus, string> = {
  pending: "На розгляді",
  approved: "Схвалено",
  rejected: "Відхилено",
};

// ---------- Кольори ----------

function pickByHash<T>(key: string, list: readonly T[]): T {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.codePointAt(0)!) | 0;
  return list[Math.abs(hash) % list.length]!;
}

const COVER_GRADIENTS = [
  "from-amber-900 via-stone-800 to-neutral-900",
  "from-lime-900 via-emerald-900 to-neutral-900",
  "from-orange-900 via-amber-950 to-neutral-900",
  "from-sky-900 via-slate-800 to-neutral-900",
  "from-violet-900 via-purple-950 to-neutral-900",
  "from-rose-900 via-pink-950 to-neutral-900",
  "from-teal-900 via-cyan-950 to-neutral-900",
];

/** Фон обкладинки без фото — стабільний для категорії. */
export function categoryGradient(categoryId: string) {
  return pickByHash(categoryId, COVER_GRADIENTS);
}

const AVATAR_ACCENTS = [
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-700",
  "from-rose-500 to-fuchsia-600",
  "from-cyan-500 to-blue-700",
  "from-violet-500 to-purple-700",
  "from-amber-500 to-orange-600",
];

/** Стабільний колір аватара-заглушки для людини. */
export function avatarAccent(key: string) {
  return pickByHash(key, AVATAR_ACCENTS);
}

/** 1 учасник, 2 учасники, 5 учасників. */
export function plural(count: number, [one, few, many]: [string, string, string]) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

// ---------- Фільтри стрічки ----------

export const DATE_FILTERS = [
  { id: "today", label: "Сьогодні" },
  { id: "weekend", label: "Цими вихідними" },
] as const;

export type FeedFilter =
  | { kind: "all" }
  | { kind: "date"; id: (typeof DATE_FILTERS)[number]["id"] }
  | { kind: "category"; id: string };

/** `?filter=today|weekend` або `?category=<id>` → фільтр і query для API. */
export function parseFeedFilter(
  params: Record<string, string | string[] | undefined>,
  categories: Category[],
): { filter: FeedFilter; query: Record<string, string> } {
  const date = DATE_FILTERS.find((item) => item.id === params.filter);
  // У стрічці завершені події лишаються — під активними.
  if (date) return { filter: { kind: "date", id: date.id }, query: { date: date.id, when: "all" } };
  const category = categories.find((item) => item.id === params.category);
  if (category) {
    return {
      filter: { kind: "category", id: category.id },
      query: { category: category.id, when: "all" },
    };
  }
  return { filter: { kind: "all" }, query: { when: "all" } };
}

// ---------- Дати ----------

/** Усі дати показуємо й вводимо в часі Познані — і на сервері, і в браузері. */
export const APP_TIMEZONE = "Europe/Warsaw";

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE });
const timeFormat = new Intl.DateTimeFormat("uk-UA", {
  timeZone: APP_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const weekdayFormat = new Intl.DateTimeFormat("uk-UA", {
  timeZone: APP_TIMEZONE,
  weekday: "long",
});
const dayMonthFormat = new Intl.DateTimeFormat("uk-UA", {
  timeZone: APP_TIMEZONE,
  day: "numeric",
  month: "long",
});

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** `YYYY-MM-DD` у Познані: сьогодні + days. */
export function localDayKey(days = 0) {
  const today = Date.parse(`${dayKey.format(new Date())}T12:00:00Z`);
  return new Date(today + days * 86_400_000).toISOString().slice(0, 10);
}

/** 1 = понеділок … 7 = неділя для `YYYY-MM-DD`. */
export function isoWeekday(key: string) {
  return new Date(`${key}T12:00:00Z`).getUTCDay() || 7;
}

function daysFromToday(date: Date) {
  const toUtcDay = (value: string) => Date.parse(`${value}T00:00:00Z`);
  return Math.round((toUtcDay(dayKey.format(date)) - toUtcDay(localDayKey())) / 86_400_000);
}

/** «Сьогодні», «Завтра», «Субота» (цього тижня) або «24 жовтня». */
export function formatDayLabel(iso: string) {
  const date = new Date(iso);
  const days = daysFromToday(date);
  if (days === 0) return "Сьогодні";
  if (days === 1) return "Завтра";
  if (days > 1 && days < 7) return capitalize(weekdayFormat.format(date));
  return dayMonthFormat.format(date);
}

export function formatTime(iso: string) {
  return timeFormat.format(new Date(iso));
}

/** «Субота, 18 жовтня» */
export function formatFullDate(iso: string) {
  const date = new Date(iso);
  return `${capitalize(weekdayFormat.format(date))}, ${dayMonthFormat.format(date)}`;
}

const longDateFormat = new Intl.DateTimeFormat("uk-UA", {
  timeZone: APP_TIMEZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** «17 жовтня 2026 р.» */
export function formatLongDate(iso: string) {
  return longDateFormat.format(new Date(iso));
}

export function fullName(person: { firstName: string; lastName?: string | null }) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ");
}

/** «Субота, 18 жовтня» для `YYYY-MM-DD`. */
export function formatDayKey(key: string) {
  return formatFullDate(`${key}T12:00:00Z`);
}

/** ISO → значення для `<input type="date">` і `<input type="time">` у часі Познані. */
export function toDateTimeInputs(iso: string) {
  const date = new Date(iso);
  return { date: dayKey.format(date), time: timeFormat.format(date) };
}

/** `2026-10-20` + `18:30` у часі Познані → ISO в UTC. */
export function fromDateTimeInputs(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y!, m! - 1, d!, hh!, mm!);
  // Різниця між «стінним» часом у Познані та UTC у цей момент (враховує літній час).
  const wall = (timeZone: string) =>
    Date.parse(new Date(guess).toLocaleString("en-US", { timeZone }) + " UTC");
  return new Date(guess - (wall(APP_TIMEZONE) - wall("UTC"))).toISOString();
}
