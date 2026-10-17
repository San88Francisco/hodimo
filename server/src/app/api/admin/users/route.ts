import { requireAdmin } from "@/lib/auth";
import { handler, readQuery } from "@/lib/http";
import { listUsers, ListUsersQuerySchema } from "@/lib/users";

/** Пошук користувачів: ?q=ім'я, @username або Telegram ID. */
export const GET = handler(async (request: Request) => {
  await requireAdmin(request);
  return Response.json(await listUsers(readQuery(request, ListUsersQuerySchema)));
});
