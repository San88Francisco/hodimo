import type { Metadata } from "next";

import { AccessNotice } from "@/components/layout/access-notice";
import { PageHeader } from "@/components/layout/page-header";
import { MeetupForm } from "@/components/meetups/meetup-form";
import { getMe, listCategories } from "@/lib/api";
import { accessOf } from "@/lib/meetups";

export const metadata: Metadata = { title: "Нова вилазка — Вилазки" };

export default async function NewMeetupPage() {
  const [me, categories] = await Promise.all([getMe(), listCategories()]);
  const access = accessOf(me);
  const canCreate = access === "user" || access === "admin";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Нова вилазка"
        description="Кілька полів — і компанія знайдеться."
        back={{ href: "/", label: "Усі вилазки" }}
      />
      {canCreate ? <MeetupForm categories={categories} /> : <AccessNotice access={access} />}
    </div>
  );
}
