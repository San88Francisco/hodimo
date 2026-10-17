"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

/** Хости з next.config.ts → images.remotePatterns; решту браузер вантажить напряму. */
function canOptimize(url: string) {
  try {
    return new URL(url).hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

/**
 * Фото за посиланням із чужого сайту. Ми зберігаємо лише URL, тож картинка може зникнути
 * чи бути закритою від вбудовування — тоді ховаємось і лишаємо під собою градієнт з емодзі.
 */
export function CoverImage({
  src,
  sizes,
  priority,
  className,
}: {
  src: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!canOptimize(src)}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}
