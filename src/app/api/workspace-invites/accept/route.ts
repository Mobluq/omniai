import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { workspaceInviteAcceptSchema } from "@/lib/validators/api-schemas";
import { WorkspaceTeamService } from "@/modules/workspace/workspace-team-service";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    await assertRateLimit({
      scope: "workspace.invite.accept",
      key: `${user.id}:${getClientIp(request)}`,
      limit: 10,
      windowMs: 15 * 60_000,
    });
    const body = workspaceInviteAcceptSchema.parse(await request.json());
    const result = await new WorkspaceTeamService().acceptInvite(user.id, body.token);
    return successResponse(result);
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
