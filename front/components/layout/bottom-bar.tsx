import { cn } from "@/lib/utils";

/**
 * Липка панель дій унизу екрана на мобільному (як MainButton у Telegram).
 * На десктопі — звичайний рядок кнопок у потоці сторінки.
 * Сторінці з нею потрібен нижній відступ `pb-28 lg:pb-0`, щоб панель не перекривала контент.
 */
export function BottomBar({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 px-4 pt-3 backdrop-blur-lg",
        "pb-[max(env(safe-area-inset-bottom),0.75rem)]",
        "lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
