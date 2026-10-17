import Link from "next/link";
import { UserX } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function UserNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <UserX className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-bold tracking-tight">Такого користувача немає</h1>
      <p className="text-sm text-muted-foreground">Можливо, посилання неправильне.</p>
      <Link
        href="/"
        className={cn(buttonVariants({ size: "lg" }), "mt-2 h-10 rounded-full px-5 font-semibold")}
      >
        До всіх подій
      </Link>
    </div>
  );
}
