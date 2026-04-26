import type { NextRequest } from "next/server";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { signUpSchema } from "@/lib/validators/api-schemas";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { AuthService } from "@/modules/auth/auth-service";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    assertRateLimit({ key: `signup:${getClientIp(request)}`, limit: 10, windowMs: 60_000 });
    const body = signUpSchema.parse(await request.json());
    const result = await new AuthService().signUp(body);

    return successResponse(
      {
        user: { id: result.user.id, email: result.user.email, name: result.user.name },
        workspace: { id: result.workspace.id, name: result.workspace.name },
      },
      201,
    );
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
