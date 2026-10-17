import { CalendarDays, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Префікс шляху, на якому пункт підсвічується. */
  match: (pathname: string) => boolean;
  adminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Вилазки",
    icon: CalendarDays,
    match: (pathname) => pathname === "/" || pathname.startsWith("/meetups"),
  },
  {
    href: "/admin/users",
    label: "Адмінка",
    icon: ShieldCheck,
    match: (pathname) => pathname.startsWith("/admin"),
    adminOnly: true,
  },
];
