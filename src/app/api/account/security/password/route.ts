import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { changePasswordSchema } from "@/lib/validators/api-schemas";
import { AccountService } from "@/modules/account/account-service";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    await assertRateLimit({
      scope: "account.password.change",
      key: `${user.id}:${getClientIp(request)}`,
      limit: 5,
      windowMs: 15 * 60_000,
      blockDurationMs: 15 * 60_000,
    });
    const body = changePasswordSchema.parse(await request.json());
    const result = await new AccountService().changePassword(user.id, body);
    return successResponse(result);
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
