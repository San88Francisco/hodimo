/**
 * Тестові люди для локальної розробки (сторінка /dev і перемикач у кутку).
 * Роль і блокування виставляє API при вході, тож ADMIN_TELEGRAM_IDS чіпати не треба.
 */
import type { Role } from "@/lib/meetups";

export type DevPersona = {
  key: string;
  label: string;
  telegramId: number;
  firstName: string;
  username?: string;
  role: Role;
  isBlocked: boolean;
};

export const DEV_PERSONAS: DevPersona[] = [
  {
    key: "admin",
    label: "Адмін",
    telegramId: 900001,
    firstName: "Андрій",
    username: "andrii_admin",
    role: "admin",
    isBlocked: false,
  },
  {
    key: "organizer",
    label: "Організатор",
    telegramId: 900002,
    firstName: "Оля",
    username: "olia",
    role: "organizer",
    isBlocked: false,
  },
  {
    key: "user",
    label: "Учасник",
    telegramId: 900003,
    firstName: "Макс",
    role: "user",
    isBlocked: false,
  },
  {
    key: "blocked",
    label: "Заблокований",
    telegramId: 900009,
    firstName: "Ігор",
    username: "blocked_igor",
    role: "user",
    isBlocked: true,
  },
];
