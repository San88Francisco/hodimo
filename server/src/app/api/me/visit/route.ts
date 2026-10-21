import { recordVisit } from "@/lib/analytics";
import { requireSession, toUserDto } from "@/lib/auth";
import { handler } from "@/lib/http";

/** Вхід у Mini App: як GET /api/me, але ще й рахує відкриття для аналітики. */
export const POST = handler(async (request: Request) => {
  const { user, openedAt } = await requireSession(request);
  await recordVisit(user.id, openedAt);
  return Response.json(toUserDto(user));
});
