import { redirect } from "next/navigation";

import { AccessNotice } from "@/components/layout/access-notice";
import { PageHeader } from "@/components/layout/page-header";
import { getMe } from "@/lib/api";
import { getT } from "@/lib/i18n/server";

/** Коротке посилання на власний профіль. */
export default async function MyProfilePage() {
  const me = await getMe();
  if (me) redirect(`/users/${me.id}`);
  const { t } = await getT();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.common.myProfile} back={{ href: "/", label: t.common.allMeetups }} />
      <AccessNotice access="guest" />
    </div>
  );
}
