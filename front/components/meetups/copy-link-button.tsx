"use client";

import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";

import { useT } from "@/lib/i18n/client";
import { meetupShareLink } from "@/lib/telegram";
import { cn } from "@/lib/utils";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Старі WebView без Clipboard API.
    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  }
}

/** Кнопка-іконка поверх обкладинки: копіює посилання на подію, 2 секунди показує галочку. */
export function CopyLinkButton({ meetupId, className }: { meetupId: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useT();

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    if (await copyText(meetupShareLink(meetupId))) setCopied(true);
  }

  const label = copied ? t.card.linkCopied : t.card.copyLink;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => void copy()}
      className={cn(
        "z-10 grid size-10 place-items-center rounded-full text-white backdrop-blur-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        copied ? "bg-primary text-primary-foreground" : "bg-black/55 hover:bg-black/70",
        className,
      )}
    >
      {copied ? <Check className="size-4.5" aria-hidden /> : <Link2 className="size-4.5" aria-hidden />}
      <span className="sr-only" aria-live="polite">
        {copied ? t.card.linkCopied : ""}
      </span>
    </button>
  );
}
