import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { recommendationRequestSchema } from "@/lib/validators/api-schemas";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";
import { RecommendationEngine } from "@/modules/ai/recommendation/recommendation-engine";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    await assertRateLimit({
      scope: "recommendation.evaluate",
      key: `${user.id}:${getClientIp(request)}`,
      limit: 60,
      windowMs: 60_000,
    });
    const body = recommendationRequestSchema.parse(await request.json());

    if (body.workspaceId) {
      await assertWorkspaceAccess(user.id, body.workspaceId);
    }

    const recommendation = new RecommendationEngine().evaluate({
      prompt: body.prompt,
      currentProvider: body.currentProvider,
      currentModelId: body.currentModelId,
    });

    return successResponse({ recommendation });
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
