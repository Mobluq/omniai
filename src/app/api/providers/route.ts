import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { badRequest } from "@/lib/errors/app-error";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { providerConfigurationSchema } from "@/lib/validators/api-schemas";
import { ProviderConfigurationService } from "@/modules/ai/providers/provider-config-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");

    if (!workspaceId) {
      throw badRequest("workspaceId is required.");
    }

    const providers = await new ProviderConfigurationService().listWorkspaceConnections(
      user.id,
      workspaceId,
    );
    return successResponse({ providers });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    await assertRateLimit({
      scope: "providers.update",
      key: `${user.id}:${getClientIp(request)}`,
      limit: 20,
      windowMs: 60_000,
    });
    const body = providerConfigurationSchema.parse(await request.json());
    await new ProviderConfigurationService().upsertWorkspaceConfiguration(user.id, body);
    const providers = await new ProviderConfigurationService().listWorkspaceConnections(
      user.id,
      body.workspaceId,
    );

    return successResponse({ providers });
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
