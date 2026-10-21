"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ExternalLink, X } from "lucide-react";

import { moderateMeetup } from "@/app/actions";
import { MeetupCard } from "@/components/meetups/meetup-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";
import type { Meetup } from "@/lib/meetups";
import { cn } from "@/lib/utils";

/** Подія в черзі модерації: картка + схвалити / відхилити з причиною. */
export function ModerationItem({ meetup }: { meetup: Meetup }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { t } = useT();

  function decide(decision: "approve" | "reject") {
    setError(null);
    startTransition(async () => {
      const result = await moderateMeetup(meetup.id, decision, reason.trim() || undefined);
      if (result) setError(result.message);
    });
  }

  return (
    <li className={cn("flex flex-col gap-3", pending && "opacity-60")}>
      <MeetupCard meetup={meetup} />

      {rejecting ? (
        <div className="flex flex-col gap-2">
          <Input
            autoFocus
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t.common.rejectReasonPlaceholder}
            maxLength={300}
            className="h-11 rounded-xl text-base"
          />
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="lg"
              className="h-11 rounded-full px-4"
              disabled={pending}
              onClick={() => setRejecting(false)}
            >
              {t.common.back}
            </Button>
            <Button
              variant="destructive"
              size="lg"
              className="h-11 flex-1 rounded-full font-semibold"
              disabled={pending}
              onClick={() => decide("reject")}
            >
              {pending ? t.common.rejecting : t.common.reject}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Link
            href={`/meetups/${meetup.id}`}
            aria-label={t.admin.openMeetup}
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "size-11 shrink-0 rounded-full")}
          >
            <ExternalLink aria-hidden />
          </Link>
          <Button
            variant="destructive"
            size="lg"
            className="h-11 rounded-full px-4"
            disabled={pending}
            onClick={() => setRejecting(true)}
          >
            <X aria-hidden />
            {t.common.reject}
          </Button>
          <Button
            size="lg"
            className="h-11 flex-1 rounded-full font-semibold"
            disabled={pending}
            onClick={() => decide("approve")}
          >
            <Check aria-hidden />
            {pending ? t.common.approving : t.common.approve}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}
