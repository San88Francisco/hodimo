import { requireActiveUser, requireUser } from "@/lib/auth";
import { handler, UuidParam } from "@/lib/http";
import { joinMeetup, leaveMeetup } from "@/lib/meetups";

type Context = { params: Promise<{ id: string }> };

const meetupId = async ({ params }: Context) => UuidParam.parse((await params).id);

/** Записатися. Повторний запит нічого не змінює. */
export const POST = handler(async (request: Request, context: Context) => {
  const id = await meetupId(context);
  const user = await requireActiveUser(request);
  return Response.json(await joinMeetup(user, id));
});

/** Відписатися (можна й заблокованому). */
export const DELETE = handler(async (request: Request, context: Context) => {
  const id = await meetupId(context);
  const user = await requireUser(request);
  return Response.json(await leaveMeetup(user, id));
});
