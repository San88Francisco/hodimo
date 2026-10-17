import { redirect } from "next/navigation";

import { AccessNotice } from "@/components/layout/access-notice";
import { PageHeader } from "@/components/layout/page-header";
import { getMe } from "@/lib/api";

/** Коротке посилання на власний профіль. */
export default async function MyProfilePage() {
  const me = await getMe();
  if (me) redirect(`/users/${me.id}`);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Мій профіль" back={{ href: "/", label: "Усі події" }} />
      <AccessNotice access="guest" />
    </div>
  );
}
