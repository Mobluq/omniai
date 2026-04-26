import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { badRequest } from "@/lib/errors/app-error";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";
import { UsageService } from "@/modules/usage/usage-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");

    if (!workspaceId) {
      throw badRequest("workspaceId is required.");
    }

    await assertWorkspaceAccess(user.id, workspaceId);
    const summary = await new UsageService().summarize(workspaceId);
    return successResponse({ summary });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
