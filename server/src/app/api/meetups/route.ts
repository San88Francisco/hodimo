import { optionalUser, requireActiveUser } from "@/lib/auth";
import { handler, readJson, readQuery } from "@/lib/http";
import {
  createMeetup,
  CreateMeetupSchema,
  listMeetups,
  ListMeetupsQuerySchema,
} from "@/lib/meetups";

/** Стрічка майбутніх вилазок (бачать усі): ?date=today|weekend&category=<id>&city=…&limit=&offset= */
export const GET = handler(async (request: Request) => {
  const query = readQuery(request, ListMeetupsQuerySchema);
  return Response.json(await listMeetups(query, await optionalUser(request)));
});

/** Створити вилазку може будь-який незаблокований користувач — він стає організатором. */
export const POST = handler(async (request: Request) => {
  const user = await requireActiveUser(request);
  const input = await readJson(request, CreateMeetupSchema);
  return Response.json(await createMeetup(user, input), { status: 201 });
});
