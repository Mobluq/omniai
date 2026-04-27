import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { updateProfileSchema } from "@/lib/validators/api-schemas";
import { AccountService } from "@/modules/account/account-service";

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await new AccountService().getProfile(user.id);
    return successResponse({ profile });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    await assertRateLimit({
      scope: "account.profile.update",
      key: `${user.id}:${getClientIp(request)}`,
      limit: 20,
      windowMs: 60_000,
    });
    const body = updateProfileSchema.parse(await request.json());
    const profile = await new AccountService().updateProfile(user.id, body);
    return successResponse({ profile });
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
