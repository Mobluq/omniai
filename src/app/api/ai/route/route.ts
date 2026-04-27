import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { routeRequestSchema } from "@/lib/validators/api-schemas";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";
import { RoutingEngine } from "@/modules/ai/routing/routing-engine";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    await assertRateLimit({
      scope: "ai.route",
      key: `${user.id}:${getClientIp(request)}`,
      limit: 40,
      windowMs: 60_000,
    });
    const body = routeRequestSchema.parse(await request.json());
    await assertWorkspaceAccess(user.id, body.workspaceId, "member");

    const result = await new RoutingEngine().route({
      prompt: body.prompt,
      routingMode: body.routingMode,
      selectedProvider: body.selectedProvider,
      selectedModelId: body.selectedModelId,
      userId: user.id,
      workspaceId: body.workspaceId,
    });

    return successResponse(result);
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
