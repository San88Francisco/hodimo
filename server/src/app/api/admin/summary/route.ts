import { requireAdmin } from "@/lib/auth";
import { handler } from "@/lib/http";
import { countPending } from "@/lib/meetups";

/** Лічильники для меню адміна. */
export const GET = handler(async (request: Request) => {
  await requireAdmin(request);
  return Response.json({ pendingMeetups: await countPending() });
});
