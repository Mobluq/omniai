import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
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
