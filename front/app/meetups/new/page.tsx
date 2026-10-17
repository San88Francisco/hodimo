import type { Metadata } from "next";

import { AccessNotice } from "@/components/layout/access-notice";
import { PageHeader } from "@/components/layout/page-header";
import { MeetupForm } from "@/components/meetups/meetup-form";
import { getMe, listCategories } from "@/lib/api";
import { accessOf, canCreateMeetups } from "@/lib/meetups";

export const metadata: Metadata = { title: "Нова подія — Ходімо" };

export default async function NewMeetupPage() {
  const [me, categories] = await Promise.all([getMe(), listCategories()]);
  const access = accessOf(me);
  const canCreate = canCreateMeetups(access);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Нова подія"
        description="Кілька полів — і компанія знайдеться."
        back={{ href: "/", label: "Усі події" }}
      />
      {canCreate ? <MeetupForm categories={categories} /> : <AccessNotice access={access} need="create" />}
    </div>
  );
}
