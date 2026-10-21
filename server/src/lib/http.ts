import { z } from "zod";

import { requestLocale, translate } from "@/lib/i18n";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string) => new HttpError(400, "bad_request", message);
export const unauthorized = (message = "Відкрий застосунок у Telegram, щоб продовжити") =>
  new HttpError(401, "unauthorized", message);
export const forbidden = (message = "Недостатньо прав") => new HttpError(403, "forbidden", message);
export const notFound = (message = "Не знайдено") => new HttpError(404, "not_found", message);
export const conflict = (message: string) => new HttpError(409, "conflict", message);

function errorResponse(status: number, code: string, message: string, details?: unknown) {
  return Response.json({ error: { code, message, details } }, { status });
}

/**
 * Обгортка для Route Handler: перетворює HttpError і ZodError на JSON-відповіді,
 * а все інше — на 500 без витоку деталей. Повідомлення — мовою з Accept-Language.
 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const t = (message: string) => translate(message, requestLocale(args[0]));
      if (error instanceof HttpError) {
        return errorResponse(error.status, error.code, t(error.message));
      }
      if (error instanceof z.ZodError) {
        return errorResponse(
          400,
          "validation_error",
          t("Некоректні дані"),
          error.issues.map((issue) => ({ path: issue.path.join("."), message: t(issue.message) })),
        );
      }
      console.error(error);
      return errorResponse(500, "internal_error", t("Щось пішло не так"));
    }
  };
}

export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw badRequest("Тіло запиту має бути коректним JSON");
  }
  return schema.parse(body);
}

export function readQuery<T extends z.ZodType>(request: Request, schema: T): z.output<T> {
  const { searchParams } = new URL(request.url);
  return schema.parse(Object.fromEntries(searchParams));
}

export const UuidParam = z.uuid("Некоректний id");
