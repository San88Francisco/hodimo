import type { Metadata } from "next";

import { AccessNotice } from "@/components/layout/access-notice";
import { PageHeader } from "@/components/layout/page-header";
import { MeetupForm } from "@/components/meetups/meetup-form";
import { getMe, listCategories } from "@/lib/api";
import { getT } from "@/lib/i18n/server";
import { accessOf, canCreateMeetups } from "@/lib/meetups";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: `${t.form.newTitle} — Ходімо` };
}

export default async function NewMeetupPage() {
  const [me, categories, { t }] = await Promise.all([getMe(), listCategories(), getT()]);
  const access = accessOf(me);
  const canCreate = canCreateMeetups(access);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t.form.newTitle}
        description={t.form.newDescription}
        back={{ href: "/", label: t.common.allMeetups }}
      />
      {canCreate ? (
        <MeetupForm
          categories={categories}
          // Подію адміна видно одразу; подію користувача спершу перевіряє адмін.
          submitLabel={access === "admin" ? t.common.createMeetup : t.form.submitReview}
        />
      ) : (
        <AccessNotice access={access} />
      )}
    </div>
  );
}
