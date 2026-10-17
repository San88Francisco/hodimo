"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Plus, Trash2 } from "lucide-react";

import { addCategory, editCategory, removeCategory } from "@/app/actions";
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

function CategoryRow({ category }: { category: Category }) {
  const [name, setName] = useState(category.name);
  const [emoji, setEmoji] = useState(category.emoji);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { error, pending, run } = useAction();
  const dirty = name.trim() !== category.name || emoji.trim() !== category.emoji;

  return (
    <li className={cn("flex flex-col gap-2 py-3", category.isArchived && "opacity-60")}>
      <div className="flex items-center gap-2">
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

export function CategoryManager({ categories }: { categories: Category[] }) {
  return (
    <div className="flex flex-col gap-5">
      <NewCategory />
      <ul className="divide-y divide-border">
        {categories.map((category) => (
          // key з даними — щоб після збереження поля скинулись до нових значень.
          <CategoryRow
            key={`${category.id}:${category.name}:${category.emoji}:${category.isArchived}`}
            category={category}
          />
        ))}
      </ul>
    </div>
  );
}
