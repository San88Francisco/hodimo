import { requireAdmin } from "@/lib/auth";
import { handler, UuidParam } from "@/lib/http";
import { approveMeetup } from "@/lib/meetups";

type Context = { params: Promise<{ id: string }> };

/** Адмін схвалює подію — її бачать усі. */
export const POST = handler(async (request: Request, { params }: Context) => {
  const id = UuidParam.parse((await params).id);
  const admin = await requireAdmin(request);
  return Response.json(await approveMeetup(admin, id));
});
