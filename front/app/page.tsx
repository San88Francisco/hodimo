import Link from "next/link";
import { Plus } from "lucide-react";

import { AccessNotice } from "@/components/layout/access-notice";
import { PageHeader } from "@/components/layout/page-header";
import { UserMenu } from "@/components/layout/user-menu";
import { MeetupsFeed } from "@/components/meetups/meetups-feed";
import { buttonVariants } from "@/components/ui/button";
import { getMe, listCategories, listMeetups } from "@/lib/api";
import { accessOf, parseFeedFilter } from "@/lib/meetups";
import { cn } from "@/lib/utils";

export default async function Home({ searchParams }: PageProps<"/">) {
  const [me, categories] = await Promise.all([getMe(), listCategories()]);
  const { filter, query } = parseFeedFilter(await searchParams, categories);
  const { items } = await listMeetups(query);

  const access = accessOf(me);
  const canCreate = access === "user" || access === "admin";

  return (
    <>
      <PageHeader
        title="Вилазки"
        description="Знайди компанію поруч — або збери свою за пару хвилин."
        action={
          <>
            {canCreate && (
              <Link
                href="/meetups/new"
                className={cn(buttonVariants({ size: "lg" }), "h-9 rounded-full px-4 font-semibold")}
              >
                <Plus className="size-4" aria-hidden />
                Створити
              </Link>
            )}
            <UserMenu me={me} />
          </>
        }
      />

      <div className="flex flex-col gap-4 lg:gap-6">
        <AccessNotice access={access} />
        <MeetupsFeed meetups={items} filter={filter} categories={categories} canCreate={canCreate} />
      </div>
    </>
  );
}
