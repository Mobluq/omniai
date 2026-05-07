import { z } from "zod";
import { fail } from "@/lib/errors/api-response";

export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { ok: false as const, response: fail("invalid_json", "Request body must be valid JSON.", 400) };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      ok: false as const,
      response: fail("invalid_request", z.prettifyError(result.error), 422),
    };
  }

  return { ok: true as const, data: result.data };
}
