import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { AccountService } from "@/modules/account/account-service";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    await assertRateLimit({
      scope: "account.2fa.setup",
      key: `${user.id}:${getClientIp(request)}`,
      limit: 5,
      windowMs: 15 * 60_000,
    });
    const setup = await new AccountService().startTwoFactorSetup(user.id);
    return successResponse({ setup });
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
