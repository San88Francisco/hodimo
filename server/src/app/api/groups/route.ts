import { connection } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { createGroup, GroupInputSchema, listGroups } from "@/lib/groups";
import { handler, readJson } from "@/lib/http";

/** Усі групи — для форми події й адмінки. */
export const GET = handler(async () => {
  await connection();
  return Response.json({ items: await listGroups() });
});

/** Адмін додає групу за посиланням t.me; назву й аватар підтягуємо з Telegram. */
export const POST = handler(async (request: Request) => {
  await requireAdmin(request);
  const input = await readJson(request, GroupInputSchema);
  return Response.json(await createGroup(input), { status: 201 });
});
