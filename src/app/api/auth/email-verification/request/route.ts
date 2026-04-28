import type { NextRequest } from "next/server";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { emailVerificationRequestSchema } from "@/lib/validators/api-schemas";
import { AuthService } from "@/modules/auth/auth-service";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    await assertRateLimit({
      scope: "auth.email_verification.request",
      key: getClientIp(request),
      limit: 5,
      windowMs: 15 * 60_000,
      blockDurationMs: 30 * 60_000,
    });
    const body = emailVerificationRequestSchema.parse(await request.json());
    const result = await new AuthService().requestEmailVerification(body);
    return successResponse(result);
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
