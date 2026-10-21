import { CalendarDays, ChartColumn, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Dictionary } from "@/lib/i18n/dictionaries";

export type NavItem = {
  href: string;
  label: (t: Dictionary) => string;
  icon: LucideIcon;
  /** Префікс шляху, на якому пункт підсвічується. */
  match: (pathname: string) => boolean;
  adminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: (t) => t.nav.meetups,
    icon: CalendarDays,
    match: (pathname) => pathname === "/" || pathname.startsWith("/meetups"),
  },
  {
    href: "/admin/moderation",
    label: (t) => t.common.admin,
    icon: ShieldCheck,
    match: (pathname) => pathname.startsWith("/admin") && !pathname.startsWith("/admin/analytics"),
    adminOnly: true,
  },
  {
    href: "/admin/analytics",
    label: (t) => t.nav.analytics,
    icon: ChartColumn,
    match: (pathname) => pathname.startsWith("/admin/analytics"),
    adminOnly: true,
  },
];
