import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { createWorkspaceSchema } from "@/lib/validators/api-schemas";
import { WorkspaceService } from "@/modules/workspace/workspace-service";

export async function GET() {
  try {
    const user = await requireUser();
    const workspaces = await new WorkspaceService().listForUser(user.id);
    return successResponse({ workspaces });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = createWorkspaceSchema.parse(await request.json());
    const workspace = await new WorkspaceService().create(user.id, body.name);
    return successResponse({ workspace }, 201);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
