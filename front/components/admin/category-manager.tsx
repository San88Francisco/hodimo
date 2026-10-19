"use client";

import { useRef, useState, useTransition } from "react";
import { Archive, ArchiveRestore, GripVertical, Plus, Trash2 } from "lucide-react";

import { addCategory, editCategory, removeCategory, reorderCategories } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Category } from "@/lib/meetups";
import { cn } from "@/lib/utils";

type Result = { message: string } | null;

function useAction() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<Result>, onSuccess?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result) setError(result.message);
      else onSuccess?.();
    });
  };
  return { error, pending, run };
}

function NewCategory() {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const { error, pending, run } = useAction();

  return (
    <form
      className="flex flex-col gap-2 rounded-2xl bg-card p-4 ring-1 ring-white/5"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () => addCategory({ name, emoji }),
          () => {
            setName("");
            setEmoji("");
          },
        );
      }}
    >
      <p className="text-sm font-medium">Нова категорія</p>
      <div className="flex gap-2">
        <Input
          aria-label="Емодзі"
          placeholder="🙂"
          className="h-11 w-14 shrink-0 rounded-xl text-center text-lg"
          value={emoji}
          onChange={(event) => setEmoji(event.target.value)}
        />
        <Input
          aria-label="Назва"
          placeholder="Назва"
          className="h-11 min-w-0 flex-1 rounded-xl text-base"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button
          type="submit"
          size="lg"
          aria-label="Додати"
          className="size-11 shrink-0 rounded-full"
          disabled={pending || !name.trim() || !emoji.trim()}
        >
          <Plus className="size-5" aria-hidden />
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

/** Обробники «ручки» рядка: перетягування пальцем / мишею та стрілки з клавіатури. */
type DragHandle = {
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
};

function CategoryRow({
  category,
  dragging,
  handle,
}: {
  category: Category;
  dragging: boolean;
  handle: DragHandle;
}) {
  const [name, setName] = useState(category.name);
  const [emoji, setEmoji] = useState(category.emoji);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { error, pending, run } = useAction();
  const dirty = name.trim() !== category.name || emoji.trim() !== category.emoji;

  return (
    <li
      data-id={category.id}
      className={cn(
        "flex flex-col gap-2 py-3",
        dragging && "relative z-10 rounded-2xl bg-secondary px-2 shadow-lg shadow-black/40",
      )}
    >
      <div className={cn("flex items-center gap-2", category.isArchived && "opacity-60")}>
        {/* touch-none — щоб у Telegram палець тягнув рядок, а не прокручував сторінку. */}
        <button
          type="button"
          aria-label={`Перетягнути «${category.name}»`}
          title="Перетягни, щоб змінити порядок"
          className={cn(
            "-ml-1 grid h-11 w-7 shrink-0 touch-none place-items-center rounded-lg text-muted-foreground outline-none select-none focus-visible:ring-2 focus-visible:ring-ring",
            dragging ? "cursor-grabbing text-foreground" : "cursor-grab hover:text-foreground",
          )}
          {...handle}
        >
          <GripVertical className="size-5" aria-hidden />
        </button>
        <Input
          aria-label="Емодзі"
          className="h-11 w-14 shrink-0 rounded-xl text-center text-lg"
          value={emoji}
          onChange={(event) => setEmoji(event.target.value)}
        />
        <Input
          aria-label="Назва"
          className="h-11 min-w-0 flex-1 rounded-xl text-base"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        {dirty ? (
          <Button
            size="lg"
            className="h-11 shrink-0 rounded-full px-4"
            disabled={pending}
            onClick={() => run(() => editCategory(category.id, { name, emoji }))}
          >
            Зберегти
          </Button>
        ) : (
          <>
            <Button
              variant="secondary"
              size="lg"
              aria-label={category.isArchived ? "Повернути з архіву" : "В архів"}
              title={category.isArchived ? "Повернути з архіву" : "В архів"}
              className="size-11 shrink-0 rounded-full"
              disabled={pending}
              onClick={() => run(() => editCategory(category.id, { isArchived: !category.isArchived }))}
            >
              {category.isArchived ? (
                <ArchiveRestore className="size-4" aria-hidden />
              ) : (
                <Archive className="size-4" aria-hidden />
              )}
            </Button>
            <Button
              variant="destructive"
              size="lg"
              aria-label="Видалити"
              className="size-11 shrink-0 rounded-full"
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </>
        )}
      </div>

      {category.isArchived && (
        <p className="text-xs text-muted-foreground">В архіві: не показується у формі й фільтрах</p>
      )}
      {confirmDelete && (
        <div className="flex items-center gap-2 text-sm">
          <span className="flex-1">Видалити «{category.name}»?</span>
          <Button variant="ghost" size="sm" className="h-9 rounded-full" onClick={() => setConfirmDelete(false)}>
            Ні
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-9 rounded-full px-3.5"
            disabled={pending}
            onClick={() => run(() => removeCategory(category.id), () => setConfirmDelete(false))}
          >
            Так
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </li>
  );
}

const sameOrder = (a: Category[], b: Category[]) => a.every((item, index) => item.id === b[index]?.id);

function move(items: Category[], id: string, to: number) {
  const from = items.findIndex((item) => item.id === id);
  if (from === -1 || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  // Локальний порядок: під час перетягування рядки міняються одразу, на сервер — лише по відпусканні.
  const [items, setItems] = useState(categories);
  const [synced, setSynced] = useState(categories);
  if (categories !== synced) {
    setSynced(categories);
    setItems(categories);
  }
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { error, pending, run } = useAction();

  function save(next: Category[]) {
    if (sameOrder(next, categories)) return;
    run(
      async () => {
        const result = await reorderCategories(next.map((item) => item.id));
        if (result) setItems(categories); // не вдалося — повертаємо як було
        return result;
      },
    );
  }

  /** Куди стати рядку: скільки інших рядків мають середину вище за палець. */
  function targetIndex(id: string, clientY: number) {
    const rows = Array.from(listRef.current?.children ?? []) as HTMLElement[];
    return rows.filter((row) => {
      if (row.dataset.id === id) return false;
      const rect = row.getBoundingClientRect();
      return clientY > rect.top + rect.height / 2;
    }).length;
  }

  function handleFor(id: string): DragHandle {
    const drop = () => {
      if (draggingId !== id) return;
      setDraggingId(null);
      save(items);
    };
    return {
      onPointerDown(event) {
        if (pending || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDraggingId(id);
      },
      onPointerMove(event) {
        if (draggingId !== id) return;
        const to = targetIndex(id, event.clientY);
        setItems((current) => move(current, id, to));
      },
      onPointerUp: drop,
      onPointerCancel: drop,
      onKeyDown(event) {
        if (pending || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
        event.preventDefault();
        const from = items.findIndex((item) => item.id === id);
        const to = from + (event.key === "ArrowUp" ? -1 : 1);
        if (to < 0 || to >= items.length) return;
        const next = move(items, id, to);
        setItems(next);
        save(next);
      },
    };
  }

  return (
    <div className="flex flex-col gap-5">
      <NewCategory />
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">
          {pending ? "Зберігаю порядок…" : "Тягни за ⋮⋮, щоб змінити порядок у фільтрах і формі."}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <ul ref={listRef} className={cn("divide-y divide-border", draggingId && "select-none")}>
          {items.map((category) => (
            // key з даними — щоб після збереження поля скинулись до нових значень.
            <CategoryRow
              key={`${category.id}:${category.name}:${category.emoji}:${category.isArchived}`}
              category={category}
              dragging={draggingId === category.id}
              handle={handleFor(category.id)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
