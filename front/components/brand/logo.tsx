import { cn } from "@/lib/utils";

const LIGHT = "#F4F2EC";
const ACCENT = "var(--color-primary, #F5C02E)";

/**
 * Знак «Ходімо»: четверо різних людей ідуть разом — рибак, SUP, футболіст і з телефоном.
 * Без фону — для інтерфейсу; з фоном — app/icon.svg і PNG для Telegram.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="4 13 88 67"
      className={cn("aspect-88/67 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Рибак: вудка на плечі, волосінь із гачком */}
        <g stroke={LIGHT}>
          <path d="M25 50 Q16 34 6 28" strokeWidth="2.2" />
          <path d="M6 28 L6 44" strokeWidth="0.9" />
          <path d="M6 44 Q6 47 8.5 46" strokeWidth="1.2" />
          <path d="M21 46 Q20 54 19 60" strokeWidth="9" />
          <path d="M19 60 Q23 68 26 76" strokeWidth="5.5" />
          <path d="M19 60 Q15 68 11 75" strokeWidth="5.5" />
          <path d="M21 49 Q24 53 25 50" strokeWidth="4" />
        </g>
        {/* SUP: весло лопаттю вгору */}
        <g stroke={ACCENT}>
          <path d="M47 30 L47 72" strokeWidth="2.4" />
          <path d="M44.5 72 L49.5 72" strokeWidth="2.4" />
          <path d="M40 46 Q39 54 38 60" strokeWidth="9" />
          <path d="M38 60 Q42 68 45 76" strokeWidth="5.5" />
          <path d="M38 60 Q34 68 30 75" strokeWidth="5.5" />
          <path d="M40 49 Q44 50 47 47" strokeWidth="4" />
        </g>
        <path d="M47 15 Q51.5 22 47 33 Q42.5 22 47 15 Z" fill={ACCENT} stroke={ACCENT} strokeWidth="1.5" />
        {/* Футболіст: веде м'яч */}
        <g stroke={LIGHT}>
          <path d="M60 46 Q59 54 57 60" strokeWidth="9" />
          <path d="M57 60 Q61 66 65 72" strokeWidth="5.5" />
          <path d="M57 60 Q53 68 49 75" strokeWidth="5.5" />
          <path d="M60 49 Q64 53 67 51" strokeWidth="4" />
          <path d="M59 49 Q55 53 53 56" strokeWidth="4" />
        </g>
        {/* Попереду: рука опущена, в ній телефон */}
        <g stroke={ACCENT}>
          <path d="M79 46 Q78 54 77 60" strokeWidth="9" />
          <path d="M77 60 Q81 68 85 75" strokeWidth="5.5" />
          <path d="M77 60 Q74 68 71 76" strokeWidth="5.5" />
          <path d="M80 48.5 Q85.5 53 87 59.5" strokeWidth="4" />
        </g>
      </g>
      {/* Телефон тильним боком, камера донизу — дві точки, як в iPhone X */}
      <g transform="rotate(-15 87.5 62.2)">
        <rect x="85.4" y="58.5" width="4.3" height="7.6" rx="1" fill={LIGHT} />
        <circle cx="88.85" cy="63.9" r="0.4" fill="#76767C" />
        <circle cx="88.85" cy="65.15" r="0.4" fill="#76767C" />
      </g>
      <circle cx="69.5" cy="73.5" r="3.6" fill={LIGHT} />
      <circle cx="22" cy="38" r="5.4" fill={LIGHT} />
      <path d="M15.5 37 Q22 33.5 28.5 37" stroke={LIGHT} strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="41" cy="38" r="5.4" fill={ACCENT} />
      <circle cx="61" cy="38" r="5.4" fill={LIGHT} />
      <circle cx="80" cy="38" r="5.4" fill={ACCENT} />
    </svg>
  );
}

/** Знак + назва. */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5 text-lg font-bold tracking-tight", className)}>
      <LogoMark className={cn("h-9 w-auto", markClassName)} />
      Ходімо
    </span>
  );
}
