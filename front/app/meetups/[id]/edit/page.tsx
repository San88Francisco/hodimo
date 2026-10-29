import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { MeetupForm } from "@/components/meetups/meetup-form";
import { getMeetup, listCategories } from "@/lib/api";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: `${t.form.editTitle} — Ходімо` };
}

export default async function EditMeetupPage({ params }: PageProps<"/meetups/[id]/edit">) {
  const { id } = await params;
  const [meetup, categories, { t }] = await Promise.all([getMeetup(id), listCategories(), getT()]);
  if (!meetup) notFound();
  // Редагують лише автор і адміни, і лише поки подія не почалася.
  if (!meetup.viewer.canManage || meetup.isPast || meetup.isCancelled) redirect(`/meetups/${meetup.id}`);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t.form.editTitle}
        back={{ href: `/meetups/${meetup.id}`, label: t.common.toMeetup }}
      />
      <MeetupForm
        categories={categories}
        meetup={meetup}
        submitLabel={
          meetup.status === "rejected" && meetup.viewer.isOrganizer ? t.form.resubmit : undefined
        }
      />
    </div>
  );
}
