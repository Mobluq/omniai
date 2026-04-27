import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { badRequest } from "@/lib/errors/app-error";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { createProjectSchema } from "@/lib/validators/api-schemas";
import { ProjectService } from "@/modules/project/project-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");

    if (!workspaceId) {
      throw badRequest("workspaceId is required.");
    }

    const projects = await new ProjectService().list(user.id, workspaceId);
    return successResponse({ projects });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = createProjectSchema.parse(await request.json());
    const project = await new ProjectService().create(user.id, body);
    return successResponse({ project }, 201);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
