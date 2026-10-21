import { getAnalytics } from "@/lib/analytics";
import { requireAdmin } from "@/lib/auth";
import { handler } from "@/lib/http";

/** Відкриття застосунку й користувачі за сьогодні, 7 і 30 днів, пів року та весь час. */
export const GET = handler(async (request: Request) => {
  await requireAdmin(request);
  return Response.json(await getAnalytics());
});
