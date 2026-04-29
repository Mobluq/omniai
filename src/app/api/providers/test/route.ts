import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { providerTestSchema } from "@/lib/validators/api-schemas";
import { ProviderConfigurationService } from "@/modules/ai/providers/provider-config-service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = providerTestSchema.parse(await request.json());
    const result = await new ProviderConfigurationService().testWorkspaceProvider({
      userId: user.id,
      workspaceId: body.workspaceId,
      provider: body.provider,
    });

    return successResponse(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
