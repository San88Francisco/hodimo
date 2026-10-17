import { requireAdmin } from "@/lib/auth";
import { handler, readJson, UuidParam } from "@/lib/http";
import { updateUser, UserPatchSchema } from "@/lib/users";

type Context = { params: Promise<{ id: string }> };

/** Змінити роль (`user` / `admin`) або заблокувати / розблокувати. */
export const PATCH = handler(async (request: Request, { params }: Context) => {
  const id = UuidParam.parse((await params).id);
  const admin = await requireAdmin(request);
  const patch = await readJson(request, UserPatchSchema);
  return Response.json(await updateUser(admin, id, patch));
});
