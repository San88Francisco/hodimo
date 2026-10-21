"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Ban, LoaderCircle } from "lucide-react";

import { editUser } from "@/app/actions";
import { PersonAvatar } from "@/components/meetups/meetup-cover";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { fullName, type Me, type Role } from "@/lib/meetups";
import { cn } from "@/lib/utils";

const ROLES: Role[] = ["user", "admin"];

/**
 * Рядок користувача в адмінці: роль (учасник / організатор / адмін) і блокування.
 * Себе змінювати не можна; адміна не можна заблокувати, а заблокованого — зробити адміном.
 */
export function UserRow({ user, isSelf }: { user: Me; isSelf: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { t } = useT();

  function update(patch: Partial<Pick<Me, "role" | "isBlocked">>) {
    setError(null);
    startTransition(async () => {
      const result = await editUser(user.id, patch);
      if (result) setError(result.message);
    });
  }

  return (
    <li className={cn("flex flex-col gap-3 py-4", pending && "opacity-70")}>
      <div className="flex items-center gap-3">
        <PersonAvatar person={user} className="size-10 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-[15px] font-medium">
            <Link href={`/users/${user.id}`} className="truncate hover:text-primary hover:underline">
              {fullName(user)}
            </Link>
            {user.isBlocked && (
              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
                {t.admin.blockedBadge}
              </span>
            )}
            {isSelf && <span className="text-xs font-normal text-muted-foreground">{t.admin.itsYou}</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {user.username ? `@${user.username} · ` : ""}ID {user.telegramId}
          </p>
        </div>
        {pending && <LoaderCircle className="size-4 animate-spin text-muted-foreground" aria-hidden />}
      </div>

      {isSelf || user.isRootAdmin ? (
        <p className="pl-13 text-xs text-muted-foreground">
          {t.roles[user.role]} · {user.isRootAdmin ? t.admin.rootAdmin : t.admin.cantChangeSelf}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2 pl-13">
          <div
            role="radiogroup"
            aria-label={t.admin.roleOf(user.firstName)}
            className="flex rounded-full bg-secondary/60 p-0.5 ring-1 ring-white/5"
          >
            {ROLES.map((role) => {
              const active = user.role === role;
              const locked = role === "admin" && user.isBlocked && !active;
              return (
                <button
                  key={role}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={pending || locked}
                  title={locked ? t.admin.unblockFirst : undefined}
                  onClick={() => !active && update({ role })}
                  className={cn(
                    "h-8 rounded-full px-3 text-xs font-medium transition-colors outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.roles[role]}
                </button>
              );
            })}
          </div>

          <Button
            variant={user.isBlocked ? "secondary" : "destructive"}
            size="sm"
            className="h-9 rounded-full px-3.5"
            disabled={pending || user.role === "admin"}
            title={user.role === "admin" ? t.admin.cantBlockAdmin : undefined}
            onClick={() => update({ isBlocked: !user.isBlocked })}
          >
            <Ban aria-hidden />
            {user.isBlocked ? t.admin.unblock : t.admin.block}
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
