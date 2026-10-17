"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Знак «Ходімо»: лідер (жовтий) біжить уперед і тягне за руку другого (світлий).
 * Руки — одна лінія з градієнтом: колір «перетікає» від одного до іншого.
 * Без фону — для інтерфейсу; з фоном — app/icon.svg і PNG для Telegram.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  // Унікальний id: однакові градієнти в прихованій бічній панелі інакше ламають видимий знак.
  const gradientId = `hodimo-hand-${useId().replace(/:/g, "")}`;

  return (
    <svg
      viewBox="8 12 80 76"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={gradientId} x1="30" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0.15" stopColor="#F4F2EC" />
          <stop offset="0.85" stopColor="var(--color-primary, #F5C02E)" />
        </linearGradient>
      </defs>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M31 50 Q47 49 64 39" stroke={`url(#${gradientId})`} strokeWidth="6" />
        <g stroke="#F4F2EC">
          <path d="M29 47 Q26 57 25 64" strokeWidth="11" />
          <path d="M25 64 Q18 71 13 79" strokeWidth="7" />
          <path d="M25 65 Q33 68 36 76" strokeWidth="7" />
        </g>
        <g stroke="var(--color-primary, #F5C02E)">
          <path d="M67 33 Q66 45 60 56" strokeWidth="12" />
          <path d="M60 56 Q71 61 82 66" strokeWidth="7.5" />
          <path d="M59 57 Q52 67 45 76" strokeWidth="7.5" />
          <path d="M66 41 Q74 45 80 40" strokeWidth="5" />
        </g>
      </g>
      <ellipse cx="27" cy="37.5" rx="6.4" ry="6" fill="#F4F2EC" transform="rotate(-15 27 37.5)" />
      <ellipse
        cx="70"
        cy="22.5"
        rx="6.8"
        ry="6.4"
        fill="var(--color-primary, #F5C02E)"
        transform="rotate(20 70 22.5)"
      />
    </svg>
  );
}

/** Знак + назва. */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5 text-lg font-bold tracking-tight", className)}>
      <LogoMark className={cn("size-9", markClassName)} />
      Ходімо
    </span>
  );
}
