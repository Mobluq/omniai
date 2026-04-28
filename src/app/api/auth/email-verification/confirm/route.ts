import type { NextRequest } from "next/server";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { emailVerificationConfirmSchema } from "@/lib/validators/api-schemas";
import { AuthService } from "@/modules/auth/auth-service";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const body = emailVerificationConfirmSchema.parse(await request.json());
    await assertRateLimit({
      scope: "auth.email_verification.confirm",
      key: `${body.email}:${getClientIp(request)}`,
      limit: 8,
      windowMs: 15 * 60_000,
      blockDurationMs: 30 * 60_000,
    });
    const result = await new AuthService().confirmEmailVerification(body);
    return successResponse(result);
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
