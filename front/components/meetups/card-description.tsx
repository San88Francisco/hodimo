"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Опис на картці: два рядки, а натиск розгортає його повністю (і згортає назад).
 * Кнопкою стає лише тоді, коли текст справді обрізаний, — інакше клік іде на картку.
 */
export function CardDescription({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [clamped, setClamped] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setClamped(node.scrollHeight > node.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const className = "text-sm leading-relaxed text-muted-foreground";

  if (expanded) {
    return (
      <button
        type="button"
        aria-expanded
        onClick={() => setExpanded(false)}
        className={cn(className, "relative z-10 text-left whitespace-pre-line outline-none")}
      >
        {text}
      </button>
    );
  }

  return (
    <p
      ref={ref}
      role={clamped ? "button" : undefined}
      tabIndex={clamped ? 0 : undefined}
      aria-expanded={clamped ? false : undefined}
      onClick={clamped ? () => setExpanded(true) : undefined}
      onKeyDown={
        clamped
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setExpanded(true);
              }
            }
          : undefined
      }
      // z-10 — над «розтягнутим» посиланням картки, щоб клік розгортав опис, а не відкривав подію.
      className={cn(className, "line-clamp-2-safe", clamped && "relative z-10 cursor-pointer outline-none")}
    >
      {text}
    </p>
  );
}
