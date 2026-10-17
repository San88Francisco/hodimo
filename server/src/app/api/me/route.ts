import { requireUser, toUserDto } from "@/lib/auth";
import { handler } from "@/lib/http";

/** Перевіряє initData, створює/оновлює користувача й повертає профіль із роллю. */
export const GET = handler(async (request: Request) => {
  return Response.json(toUserDto(await requireUser(request)));
});
