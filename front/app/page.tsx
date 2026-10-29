import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { AccessNotice } from "@/components/layout/access-notice";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PageHeader } from "@/components/layout/page-header";
import { UserMenu } from "@/components/layout/user-menu";
import { MeetupsFeed } from "@/components/meetups/meetups-feed";
import { NotificationsPrompt } from "@/components/notifications/notifications";
import { buttonVariants } from "@/components/ui/button";
import { getMe, getPendingCount, listCategories, listMeetups } from "@/lib/api";
import { getT } from "@/lib/i18n/server";
import { accessOf, canCreateMeetups, parseFeedFilter } from "@/lib/meetups";
import { cn } from "@/lib/utils";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  // Відкрили з посилання t.me/<bot>?startapp=<id> — одразу на подію.
  const startParam = params.tgWebAppStartParam;
  if (typeof startParam === "string" && UUID_RE.test(startParam)) redirect(`/meetups/${startParam}`);

  const [me, categories, { t }] = await Promise.all([getMe(), listCategories(), getT()]);
  const { filter, query } = parseFeedFilter(params, categories);
  const { items } = await listMeetups(query);

  const access = accessOf(me);
  const canCreate = canCreateMeetups(access);
  const pendingCount = access === "admin" ? await getPendingCount() : 0;

  return (
    <>
      <PageHeader
        title={t.home.title}
        description={t.home.description}
        leading={<MobileNav me={me} pendingCount={pendingCount} />}
        action={
          <>
            {canCreate && (
              <Link
                href="/meetups/new"
                className={cn(buttonVariants({ size: "lg" }), "h-9 rounded-full px-4 font-semibold")}
              >
                <Plus className="size-4" aria-hidden />
                {t.common.create}
              </Link>
            )}
            <UserMenu me={me} />
          </>
        }
      />

      <div className="flex flex-col gap-4 lg:gap-6">
        <AccessNotice access={access} />
        {me && !me.isBlocked && !me.botAccess && <NotificationsPrompt />}
        <MeetupsFeed
          meetups={items}
          filter={filter}
          categories={categories}
          canCreate={canCreate}
          isAdmin={access === "admin"}
        />
      </div>
    </>
  );
}
