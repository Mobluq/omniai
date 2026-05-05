import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { onboardingPreferenceSchema } from "@/lib/validators/api-schemas";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { OnboardingService } from "@/modules/onboarding/onboarding-service";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    await assertRateLimit({
      scope: "onboarding.complete",
      key: `${user.id}:${getClientIp(request)}`,
      limit: 12,
      windowMs: 60_000,
    });
    const body = onboardingPreferenceSchema.parse(await request.json());
    const workspace = await new OnboardingService().complete(user.id, body);

    return successResponse({ workspace });
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
