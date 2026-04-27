import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { settingsUpdateSchema } from "@/lib/validators/api-schemas";
import { SettingsService } from "@/modules/settings/settings-service";
import { WorkspaceService } from "@/modules/workspace/workspace-service";

type Context = {
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
};

export async function GET(_request: NextRequest, context: Context) {
  try {
    const user = await requireUser();
    const { workspaceId } = await context.params;
    const workspace = await new WorkspaceService().getForUser(user.id, workspaceId);
    return successResponse({ workspace });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const user = await requireUser();
    const { workspaceId } = await context.params;
    const body = settingsUpdateSchema.parse(await request.json());
    const workspace = await new SettingsService().updateWorkspaceSettings(
      user.id,
      workspaceId,
      body,
    );
    return successResponse({ workspace });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
