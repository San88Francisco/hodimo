import { requireActiveUser } from "@/lib/auth";
import { handler, readJson, UuidParam } from "@/lib/http";
import { cancelMeetup, CancelSchema } from "@/lib/meetups";

type Context = { params: Promise<{ id: string }> };

/** Організатор або адмін скасовує подію (`{ reason? }`) — учасникам пише бот. */
export const POST = handler(async (request: Request, { params }: Context) => {
  const id = UuidParam.parse((await params).id);
  const user = await requireActiveUser(request);
  const { reason } = await readJson(request, CancelSchema);
  return Response.json(await cancelMeetup(user, id, reason));
});
