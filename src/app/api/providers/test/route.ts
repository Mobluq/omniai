import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { providerTestSchema } from "@/lib/validators/api-schemas";
import { ProviderConfigurationService } from "@/modules/ai/providers/provider-config-service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = providerTestSchema.parse(await request.json());
    const providers = await new ProviderConfigurationService().listWorkspaceConnections(
      user.id,
      body.workspaceId,
    );
    const provider = providers.find((item) => item.provider === body.provider);
    const configured = Boolean(provider?.envConfigured || provider?.workspaceConfigured);

    return successResponse({
      provider: body.provider,
      configured,
      status: configured ? "ready" : "missing_credentials",
      message: configured
        ? "Provider credentials are available server-side."
        : "Add a workspace key or configure the provider environment variables.",
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
