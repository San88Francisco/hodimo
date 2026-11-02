"use client";

import { useState, useTransition } from "react";
import { Check, Plus, RefreshCw, Trash2, Undo2 } from "lucide-react";

import { addGroup, editGroup, removeGroup } from "@/app/actions";
import { GroupAvatar } from "@/components/meetups/meetup-cover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";
import { normalizeGroupUrl, type Group } from "@/lib/meetups";

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

const INPUT = "h-11 min-w-0 rounded-xl text-base";

function NewGroup() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const { error, pending, run } = useAction();
  const { t } = useT();

  return (
    <form
      className="flex flex-col gap-2 rounded-2xl bg-card p-4 ring-1 ring-white/5"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () => addGroup({ url: normalizeGroupUrl(url), name: name.trim() || undefined }),
          () => {
            setUrl("");
            setName("");
          },
        );
      }}
    >
      <p className="text-sm font-medium">{t.admin.newGroup}</p>
      <Input
        aria-label={t.admin.groupUrl}
        placeholder={t.admin.groupUrlPlaceholder}
        type="url"
        inputMode="url"
        autoComplete="off"
        className={INPUT}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
      />
      <div className="flex gap-2">
        <Input
          aria-label={t.admin.groupName}
          placeholder={t.admin.groupNameAuto}
          className={`${INPUT} flex-1`}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button
          type="submit"
          size="lg"
          aria-label={t.admin.add}
          className="size-11 shrink-0 rounded-full"
          disabled={pending || !url.trim()}
        >
          <Plus className="size-5" aria-hidden />
        </Button>
      </div>
      {pending && <p className="text-sm text-muted-foreground">{t.admin.adding}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

function GroupRow({ group }: { group: Group }) {
  const [name, setName] = useState(group.name);
  const [url, setUrl] = useState(group.url);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { error, pending, run } = useAction();
  const { t } = useT();
  const dirty = name.trim() !== group.name || url.trim() !== group.url;

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-start gap-3">
        <GroupAvatar group={group} className="size-11 text-base" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Input
            aria-label={t.admin.groupName}
            className={INPUT}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            aria-label={t.admin.groupUrl}
            type="url"
            inputMode="url"
            autoComplete="off"
            className={`${INPUT} text-sm text-muted-foreground`}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {dirty ? (
            <>
              <Button
                size="lg"
                aria-label={t.common.save}
                title={t.common.save}
                className="size-11 rounded-full"
                disabled={pending}
                onClick={() =>
                  run(() => editGroup(group.id, { name: name.trim(), url: normalizeGroupUrl(url) }))
                }
              >
                <Check className="size-5" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                aria-label={t.common.back}
                className="size-11 rounded-full"
                disabled={pending}
                onClick={() => {
                  setName(group.name);
                  setUrl(group.url);
                }}
              >
                <Undo2 className="size-4" aria-hidden />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="lg"
                aria-label={t.admin.refreshGroup}
                title={t.admin.refreshGroup}
                className="size-11 rounded-full"
                disabled={pending}
                // Те саме посилання — API заново бере аватар з Telegram.
                onClick={() => run(() => editGroup(group.id, { url: group.url }))}
              >
                <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} aria-hidden />
              </Button>
              <Button
                variant="destructive"
                size="lg"
                aria-label={t.common.delete}
                className="size-11 rounded-full"
                disabled={pending}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="flex items-center gap-2 text-sm">
          <span className="flex-1">{t.admin.deleteGroup(group.name)}</span>
          <Button variant="ghost" size="sm" className="h-9 rounded-full" onClick={() => setConfirmDelete(false)}>
            {t.common.no}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-9 rounded-full px-3.5"
            disabled={pending}
            onClick={() => run(() => removeGroup(group.id), () => setConfirmDelete(false))}
          >
            {t.common.yes}
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </li>
  );
}

export function GroupManager({ groups }: { groups: Group[] }) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-5">
      <NewGroup />
      <div className="flex flex-col gap-1">
        <p className="text-xs leading-relaxed text-muted-foreground">{t.admin.groupsHint}</p>
        {groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t.admin.noGroups}</p>
        ) : (
          <ul className="divide-y divide-border">
            {groups.map((group) => (
              // key з даними — щоб після збереження поля скинулись до нових значень.
              <GroupRow key={`${group.id}:${group.name}:${group.url}:${group.photoUrl}`} group={group} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
