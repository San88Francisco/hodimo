import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Шапка сторінки: на мобільному — липка панель із кнопкою «назад» і дією,
 * на десктопі — великий заголовок з описом.
 */
export function PageHeader({
  title,
  description,
  back,
  leading,
  action,
  mobile = true,
}: {
  title: string;
  description?: string;
  back?: { href: string; label: string };
  /** Ліворуч від заголовка на мобільному (напр. бургер-меню), якщо немає «назад». */
  leading?: React.ReactNode;
  action?: React.ReactNode;
  /** false — сторінка малює власну мобільну шапку (наприклад, поверх обкладинки). */
  mobile?: boolean;
}) {
  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-30 -mx-4 flex h-14 items-center gap-2 bg-background/85 px-4 backdrop-blur-md lg:hidden",
          !mobile && "hidden",
        )}
      >
        {back && (
          <Link
            href={back.href}
            aria-label={back.label}
            className="-ml-2 grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
        )}
        {!back && leading}
        <h1 className={cn("min-w-0 flex-1 truncate font-bold tracking-tight", back ? "text-base" : "text-xl")}>
          {title}
        </h1>
        {action}
      </header>

      <div className="mb-6 hidden lg:block">
        {back && (
          <Link
            href={back.href}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {back.label}
          </Link>
        )}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
    </>
  );
}
