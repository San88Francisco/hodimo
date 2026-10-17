import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { MeetupForm } from "@/components/meetups/meetup-form";
import { getMeetup, listCategories } from "@/lib/api";

export const metadata: Metadata = { title: "Редагувати вилазку — Вилазки" };

export default async function EditMeetupPage({ params }: PageProps<"/meetups/[id]/edit">) {
  const { id } = await params;
  const [meetup, categories] = await Promise.all([getMeetup(id), listCategories()]);
  if (!meetup) notFound();
  // Редагують лише організатор і адміни.
  if (!meetup.viewer.canManage) redirect(`/meetups/${meetup.id}`);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Редагувати вилазку"
        back={{ href: `/meetups/${meetup.id}`, label: "До вилазки" }}
      />
      <MeetupForm categories={categories} meetup={meetup} />
    </div>
  );
}
