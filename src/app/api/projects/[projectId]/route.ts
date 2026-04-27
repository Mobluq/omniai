import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { updateProjectSchema } from "@/lib/validators/api-schemas";
import { ProjectService } from "@/modules/project/project-service";

type Context = {
  params: Promise<{ projectId: string }> | { projectId: string };
};

export async function GET(_request: NextRequest, context: Context) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    const project = await new ProjectService().get(user.id, projectId);
    return successResponse({ project });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    const body = updateProjectSchema.parse(await request.json());
    const project = await new ProjectService().update(user.id, projectId, body);
    return successResponse({ project });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    const project = await new ProjectService().archive(user.id, projectId);
    return successResponse({ project });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
