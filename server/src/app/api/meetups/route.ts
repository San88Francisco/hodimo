import { requireActiveUser, viewer } from "@/lib/auth";
import { handler, readJson, readQuery } from "@/lib/http";
import {
  createMeetup,
  CreateMeetupSchema,
  listMeetups,
  ListMeetupsQuerySchema,
} from "@/lib/meetups";

/** Стрічка майбутніх подій (бачать усі): ?date=today|weekend&category=<id>&city=…&limit=&offset= */
export const GET = handler(async (request: Request) => {
  const query = readQuery(request, ListMeetupsQuerySchema);
  return Response.json(await listMeetups(query, await viewer(request)));
});

/** Створити подію може будь-хто незаблокований: подія користувача йде на розгляд адміну. */
export const POST = handler(async (request: Request) => {
  const user = await requireActiveUser(request);
  const input = await readJson(request, CreateMeetupSchema);
  return Response.json(await createMeetup(user, input), { status: 201 });
});
