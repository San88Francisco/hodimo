import { optionalUser, isAdmin, requireAdmin } from "@/lib/auth";
import { createCategory, CategoryInputSchema, listCategories } from "@/lib/categories";
import { handler, readJson } from "@/lib/http";

/** Активні категорії; адмін із `?all=1` бачить і архівні. */
export const GET = handler(async (request: Request) => {
  const wantsAll = new URL(request.url).searchParams.get("all") === "1";
  const includeArchived = wantsAll && isAdmin(await optionalUser(request));
  return Response.json({ items: await listCategories({ includeArchived }) });
});

export const POST = handler(async (request: Request) => {
  await requireAdmin(request);
  const input = await readJson(request, CategoryInputSchema);
  return Response.json(await createCategory(input), { status: 201 });
});
