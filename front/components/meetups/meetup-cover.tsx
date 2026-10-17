import Image from "next/image";

import { CoverImage } from "@/components/meetups/cover-image";
import { avatarAccent, categoryGradient, initials, type Meetup, type Person } from "@/lib/meetups";
import { cn } from "@/lib/utils";

/** Фото події, а якщо його немає — градієнт категорії з великим емодзі. */
export function MeetupCover({
  meetup,
  sizes,
  priority,
  className,
  imageClassName,
  children,
}: {
  meetup: Pick<Meetup, "imageUrl" | "category">;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-linear-to-br",
        categoryGradient(meetup.category.id),
        className,
      )}
    >
      {/* Емодзі завжди під фото: видно, якщо фото немає або воно не завантажилось. */}
      <span
        className="absolute inset-0 grid place-items-center text-6xl drop-shadow-lg"
        aria-hidden
      >
        {meetup.category.emoji}
      </span>
      {meetup.imageUrl && (
        <CoverImage
          src={meetup.imageUrl}
          sizes={sizes}
          priority={priority}
          className={imageClassName}
        />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-black/20" />
      {children}
    </div>
  );
}

export function OverlayBadge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm",
        "[&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:opacity-80",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Фото з Telegram або кольоровий кружок з першою літерою. */
export function PersonAvatar({
  person,
  className,
}: {
  person: Pick<Person, "id" | "firstName" | "photoUrl">;
  className?: string;
}) {
  const base = cn("relative size-7 shrink-0 overflow-hidden rounded-full", className);
  if (person.photoUrl) {
    return (
      <span className={base} aria-hidden>
        <Image src={person.photoUrl} alt="" fill sizes="48px" unoptimized className="object-cover" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        base,
        "grid place-items-center bg-linear-to-br text-xs font-semibold text-white",
        avatarAccent(person.id),
      )}
      aria-hidden
    >
      {initials(person.firstName)}
    </span>
  );
}
