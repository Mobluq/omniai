import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { getRequestId } from "@/lib/security/request-context";
import { workspaceMemberUpdateSchema } from "@/lib/validators/api-schemas";
import { WorkspaceTeamService } from "@/modules/workspace/workspace-team-service";

type Context = {
  params:
    | Promise<{ workspaceId: string; memberId: string }>
    | { workspaceId: string; memberId: string };
};

export async function PATCH(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    const { workspaceId, memberId } = await context.params;
    const body = workspaceMemberUpdateSchema.parse(await request.json());
    const result = await new WorkspaceTeamService().updateMemberRole(
      user.id,
      workspaceId,
      memberId,
      body.role,
    );
    return successResponse(result);
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    const { workspaceId, memberId } = await context.params;
    const result = await new WorkspaceTeamService().removeMember(user.id, workspaceId, memberId);
    return successResponse(result);
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
