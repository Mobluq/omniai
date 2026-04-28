import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { getRequestId } from "@/lib/security/request-context";
import { WorkspaceTeamService } from "@/modules/workspace/workspace-team-service";

type Context = {
  params:
    | Promise<{ workspaceId: string; inviteId: string }>
    | { workspaceId: string; inviteId: string };
};

export async function DELETE(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    const { workspaceId, inviteId } = await context.params;
    const result = await new WorkspaceTeamService().revokeInvite(user.id, workspaceId, inviteId);
    return successResponse(result);
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
