import { viewer } from "@/lib/auth";
import { handler, UuidParam } from "@/lib/http";
import { getProfile } from "@/lib/users";

type Context = { params: Promise<{ id: string }> };

/** Профіль користувача: бачать усі, приватні поля — лише сам користувач і адміни. */
export const GET = handler(async (request: Request, { params }: Context) => {
  const id = UuidParam.parse((await params).id);
  return Response.json(await getProfile(id, await viewer(request)));
});
