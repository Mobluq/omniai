import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { workspaceInviteCreateSchema } from "@/lib/validators/api-schemas";
import { WorkspaceTeamService } from "@/modules/workspace/workspace-team-service";

type Context = {
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
};

export async function POST(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    const { workspaceId } = await context.params;
    await assertRateLimit({
      scope: "workspace.invite.create",
      key: `${user.id}:${workspaceId}:${getClientIp(request)}`,
      limit: 20,
      windowMs: 60 * 60_000,
    });
    const body = workspaceInviteCreateSchema.parse(await request.json());
    const result = await new WorkspaceTeamService().createInvite({
      userId: user.id,
      workspaceId,
      email: body.email,
      role: body.role,
    });
    return successResponse(result, 201);
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
