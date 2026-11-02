import { requireAdmin } from "@/lib/auth";
import { deleteGroup, GroupPatchSchema, updateGroup } from "@/lib/groups";
import { handler, readJson, UuidParam } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

const groupId = async ({ params }: Context) => UuidParam.parse((await params).id);

export const PATCH = handler(async (request: Request, context: Context) => {
  const id = await groupId(context);
  await requireAdmin(request);
  const input = await readJson(request, GroupPatchSchema);
  return Response.json(await updateGroup(id, input));
});

/** Події групи лишаються, лише без прив'язки до неї. */
export const DELETE = handler(async (request: Request, context: Context) => {
  const id = await groupId(context);
  await requireAdmin(request);
  await deleteGroup(id);
  return new Response(null, { status: 204 });
});
