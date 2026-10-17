import { requireAdmin } from "@/lib/auth";
import { CategoryPatchSchema, deleteCategory, updateCategory } from "@/lib/categories";
import { handler, readJson, UuidParam } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

const categoryId = async ({ params }: Context) => UuidParam.parse((await params).id);

export const PATCH = handler(async (request: Request, context: Context) => {
  const id = await categoryId(context);
  await requireAdmin(request);
  const input = await readJson(request, CategoryPatchSchema);
  return Response.json(await updateCategory(id, input));
});

/** Лише порожню категорію; із подіями — 409, треба архівувати. */
export const DELETE = handler(async (request: Request, context: Context) => {
  const id = await categoryId(context);
  await requireAdmin(request);
  await deleteCategory(id);
  return new Response(null, { status: 204 });
});
