import { z } from "zod";

import { requireActiveUser } from "@/lib/auth";
import { handler, readJson } from "@/lib/http";
import { resolveImageUrl } from "@/lib/image-resolve";

const BodySchema = z.object({ url: z.string().trim().min(1).max(2000) });

/**
 * Будь-яке посилання → пряма адреса картинки (сторінка Pinterest/Instagram/…, коротке
 * посилання, Google Картинки). Лише для тих, хто увійшов, щоб це не стало відкритим проксі.
 */
export const POST = handler(async (request: Request) => {
  await requireActiveUser(request);
  const { url } = await readJson(request, BodySchema);
  return Response.json(await resolveImageUrl(url));
});
