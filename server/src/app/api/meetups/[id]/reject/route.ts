import { requireAdmin } from "@/lib/auth";
import { handler, readJson, UuidParam } from "@/lib/http";
import { rejectMeetup, RejectSchema } from "@/lib/meetups";

type Context = { params: Promise<{ id: string }> };

/** Адмін відхиляє подію (`{ reason? }`) — вона лишається лише в історії автора. */
export const POST = handler(async (request: Request, { params }: Context) => {
  const id = UuidParam.parse((await params).id);
  const admin = await requireAdmin(request);
  const { reason } = await readJson(request, RejectSchema);
  return Response.json(await rejectMeetup(admin, id, reason));
});
