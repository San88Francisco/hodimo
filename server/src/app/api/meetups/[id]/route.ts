import { requireActiveUser, viewer } from "@/lib/auth";
import { handler, readJson, UuidParam } from "@/lib/http";
import { deleteMeetup, getMeetup, updateMeetup, UpdateMeetupSchema } from "@/lib/meetups";

type Context = { params: Promise<{ id: string }> };

const meetupId = async ({ params }: Context) => UuidParam.parse((await params).id);

export const GET = handler(async (request: Request, context: Context) => {
  const id = await meetupId(context);
  return Response.json(await getMeetup(id, await viewer(request)));
});

/** Організатор або адмін. */
export const PATCH = handler(async (request: Request, context: Context) => {
  const id = await meetupId(context);
  const user = await requireActiveUser(request);
  const input = await readJson(request, UpdateMeetupSchema);
  return Response.json(await updateMeetup(user, id, input));
});

/** Організатор або адмін. */
export const DELETE = handler(async (request: Request, context: Context) => {
  const id = await meetupId(context);
  const user = await requireActiveUser(request);
  await deleteMeetup(user, id);
  return new Response(null, { status: 204 });
});
