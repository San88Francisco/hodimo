"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Pencil, Trash2, X } from "lucide-react";

import { moderateMeetup, removeMeetup, setJoined } from "@/app/actions";
import { BottomBar } from "@/components/layout/bottom-bar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Access, Meetup } from "@/lib/meetups";
import { cn } from "@/lib/utils";

const BIG = "h-12 rounded-full text-base font-semibold lg:h-11 lg:text-sm";

/**
 * Нижня панель на сторінці події. Що в ній — залежить від ролі й статусу:
 * гість бачить підказку, користувач записується, автор і адмін редагують і видаляють,
 * а поки подія на розгляді — адмін схвалює або відхиляє її.
 */
export function MeetupActions({ meetup, access }: { meetup: Meetup; access: Access }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { viewer } = meetup;

  function run(action: () => Promise<{ message: string } | null | undefined>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result) setError(result.message);
    });
  }

  if (confirmingDelete) {
    return (
      <BottomBar className="lg:border-t lg:border-border lg:pt-6">
        {error && <ErrorLine message={error} />}
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-sm font-medium lg:flex-none">Видалити подію?</p>
          <Button
            variant="ghost"
            size="lg"
            className="h-12 rounded-full px-4 lg:h-11"
            disabled={pending}
            onClick={() => setConfirmingDelete(false)}
          >
            Ні
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className={cn(BIG, "px-5")}
            disabled={pending}
            onClick={() => run(() => removeMeetup(meetup.id))}
          >
            {pending ? "Видаляю…" : "Так, видалити"}
          </Button>
        </div>
      </BottomBar>
    );
  }

  // ---------- Завершена (бачить лише адмін): змінити не можна, лише видалити ----------
  if (meetup.isPast) {
    return (
      <BottomBar className="lg:border-t lg:border-border lg:pt-6">
        {error && <ErrorLine message={error} />}
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground lg:flex-none">
            Подія вже відбулася
          </p>
          {viewer.canManage && (
            <Button
              variant="destructive"
              size="lg"
              className={cn(BIG, "px-5")}
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 aria-hidden />
              Видалити
            </Button>
          )}
        </div>
      </BottomBar>
    );
  }

  // ---------- Ще не схвалена: модерація (адмін) або правки (автор) ----------
  if (meetup.status !== "approved") {
    const adminReview = access === "admin" && !viewer.isOrganizer;

    if (adminReview && rejecting) {
      return (
        <BottomBar className="lg:border-t lg:border-border lg:pt-6">
          {error && <ErrorLine message={error} />}
          <div className="flex flex-col gap-2">
            <Input
              autoFocus
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Причина (необов'язково) — її побачить автор"
              maxLength={300}
              className="h-11 rounded-xl text-base"
            />
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="lg"
                className="h-12 rounded-full px-4 lg:h-11"
                disabled={pending}
                onClick={() => setRejecting(false)}
              >
                Назад
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className={cn(BIG, "flex-1 px-5 lg:flex-none")}
                disabled={pending}
                onClick={() => run(() => moderateMeetup(meetup.id, "reject", reason.trim() || undefined))}
              >
                {pending ? "Відхиляю…" : "Відхилити"}
              </Button>
            </div>
          </div>
        </BottomBar>
      );
    }

    return (
      <BottomBar className="lg:border-t lg:border-border lg:pt-6">
        {error && <ErrorLine message={error} />}
        <div className="flex items-center gap-3">
          {adminReview ? (
            <>
              {meetup.status === "pending" && (
                <Button
                  variant="destructive"
                  size="lg"
                  className={cn(BIG, "px-5")}
                  disabled={pending}
                  onClick={() => setRejecting(true)}
                >
                  <X aria-hidden />
                  Відхилити
                </Button>
              )}
              <Button
                size="lg"
                className={cn(BIG, "flex-1 px-5 lg:flex-none")}
                disabled={pending}
                onClick={() => run(() => moderateMeetup(meetup.id, "approve"))}
              >
                <Check aria-hidden />
                {pending ? "Схвалюю…" : "Схвалити"}
              </Button>
            </>
          ) : (
            <Link
              href={`/meetups/${meetup.id}/edit`}
              className={cn(buttonVariants({ size: "lg" }), BIG, "flex-1 px-5 lg:flex-none")}
            >
              <Pencil aria-hidden />
              {meetup.status === "rejected" ? "Виправити й надіслати знову" : "Редагувати"}
            </Link>
          )}
          {viewer.canManage && (
            <Button
              variant="destructive"
              size="lg"
              aria-label="Видалити"
              className="size-12 shrink-0 rounded-full lg:size-11"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 className="size-5 lg:size-4" aria-hidden />
            </Button>
          )}
        </div>
      </BottomBar>
    );
  }

  const manageButtons = viewer.canManage && (
    <>
      {!viewer.isOrganizer && (
        <Link
          href={`/meetups/${meetup.id}/edit`}
          aria-label="Редагувати"
          className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "size-12 shrink-0 rounded-full lg:size-11")}
        >
          <Pencil className="size-5 lg:size-4" aria-hidden />
        </Link>
      )}
      <Button
        variant="destructive"
        size="lg"
        aria-label="Видалити"
        className="size-12 shrink-0 rounded-full lg:size-11"
        onClick={() => setConfirmingDelete(true)}
      >
        <Trash2 className="size-5 lg:size-4" aria-hidden />
      </Button>
    </>
  );

  let primary: React.ReactNode;
  let hint: string | null = null;

  if (viewer.isOrganizer && viewer.canManage) {
    primary = (
      <Link
        href={`/meetups/${meetup.id}/edit`}
        className={cn(buttonVariants({ size: "lg" }), BIG, "flex-1 px-5 lg:flex-none")}
      >
        <Pencil aria-hidden />
        Редагувати
      </Link>
    );
  } else if (viewer.isJoined) {
    hint = access === "blocked" ? "Акаунт заблоковано, але скасувати запис можна" : null;
    primary = (
      <Button
        variant="secondary"
        size="lg"
        className={cn(BIG, "flex-1 px-5 lg:flex-none")}
        disabled={pending}
        onClick={() => run(() => setJoined(meetup.id, false))}
      >
        <Check className="text-primary" aria-hidden />
        {pending ? "Скасовую…" : "Ти йдеш · Скасувати"}
      </Button>
    );
  } else {
    const blockedReason =
      access === "guest"
        ? "Щоб записатися, відкрий застосунок у Telegram"
        : access === "blocked"
          ? "Твій акаунт заблоковано"
          : null;
    hint = blockedReason;
    primary = (
      <Button
        size="lg"
        className={cn(BIG, "flex-1 px-5 lg:flex-none")}
        disabled={pending || meetup.isFull || blockedReason !== null}
        onClick={() => run(() => setJoined(meetup.id, true))}
      >
        {meetup.isFull ? "Місць немає" : pending ? "Записую…" : "Записатися"}
      </Button>
    );
  }

  return (
    <BottomBar className="lg:border-t lg:border-border lg:pt-6">
      {error && <ErrorLine message={error} />}
      {hint && <p className="mb-2 text-center text-xs text-muted-foreground lg:text-left">{hint}</p>}
      <div className="flex items-center gap-3">
        {primary}
        {manageButtons}
      </div>
    </BottomBar>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p role="alert" className="mb-2 text-sm text-destructive">
      {message}
    </p>
  );
}
