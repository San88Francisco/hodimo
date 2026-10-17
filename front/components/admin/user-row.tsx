"use client";

import { useState, useTransition } from "react";

import { editUser } from "@/app/actions";
import { PersonAvatar } from "@/components/meetups/meetup-cover";
import { Button } from "@/components/ui/button";
import type { Me } from "@/lib/meetups";
import { cn } from "@/lib/utils";

function Badge({ tone, children }: { tone: "primary" | "destructive"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "primary" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive",
      )}
    >
      {children}
    </span>
  );
}

/** Рядок користувача в адмінці: роль і блокування. Себе змінювати не можна. */
export function UserRow({ user, isSelf }: { user: Me; isSelf: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update(patch: Partial<Pick<Me, "role" | "isBlocked">>) {
    setError(null);
    startTransition(async () => {
      const result = await editUser(user.id, patch);
      if (result) setError(result.message);
    });
  }

  const isAdmin = user.role === "admin";

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex items-center gap-3">
        <PersonAvatar person={user} className="size-10 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-[15px] font-medium">
            <span className="truncate">
              {user.firstName} {user.lastName}
            </span>
            {isAdmin && <Badge tone="primary">адмін</Badge>}
            {user.isBlocked && <Badge tone="destructive">заблоковано</Badge>}
            {isSelf && <span className="text-xs font-normal text-muted-foreground">це ти</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {user.username ? `@${user.username} · ` : ""}ID {user.telegramId}
          </p>
        </div>
      </div>

      {!isSelf && (
        <div className="flex gap-2 pl-13">
          <Button
            variant="secondary"
            size="sm"
            className="h-9 rounded-full px-3.5"
            disabled={pending || (user.isBlocked && !isAdmin)}
            onClick={() => update({ role: isAdmin ? "user" : "admin" })}
          >
            {isAdmin ? "Зняти адміна" : "Зробити адміном"}
          </Button>
          <Button
            variant={user.isBlocked ? "secondary" : "destructive"}
            size="sm"
            className="h-9 rounded-full px-3.5"
            disabled={pending || isAdmin}
            onClick={() => update({ isBlocked: !user.isBlocked })}
          >
            {user.isBlocked ? "Розблокувати" : "Заблокувати"}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="pl-13 text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}
