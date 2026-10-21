import Link from "next/link";
import { SearchX } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <SearchX className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-bold tracking-tight">{t.meetup.notFoundTitle}</h1>
      <p className="text-sm text-muted-foreground">
        {t.meetup.notFoundBody}
      </p>
      <Link
        href="/"
        className={cn(buttonVariants({ size: "lg" }), "mt-2 h-10 rounded-full px-5 font-semibold")}
      >
        {t.common.toAllMeetups}
      </Link>
    </div>
  );
}
