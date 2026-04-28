import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";
import { billingCheckoutSchema } from "@/lib/validators/api-schemas";
import { BillingService } from "@/modules/billing/billing-service";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    await assertRateLimit({
      scope: "billing.checkout",
      key: `${user.id}:${getClientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });
    const body = billingCheckoutSchema.parse(await request.json());
    await assertWorkspaceAccess(user.id, body.workspaceId, "admin");
    const result = await new BillingService().createCheckoutSession({
      workspaceId: body.workspaceId,
      userId: user.id,
      userEmail: user.email,
      planCode: body.planCode,
    });
    return successResponse(result);
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
