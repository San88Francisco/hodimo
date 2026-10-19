import { requireAdmin } from "@/lib/auth";
import { CategoryOrderSchema, reorderCategories } from "@/lib/categories";
import { handler, readJson } from "@/lib/http";

/** Новий порядок категорій (перетягування в адмінці): `{ ids }` у порядку показу. */
export const PUT = handler(async (request: Request) => {
  await requireAdmin(request);
  const input = await readJson(request, CategoryOrderSchema);
  return Response.json({ items: await reorderCategories(input) });
});
