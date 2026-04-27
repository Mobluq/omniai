import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { badRequest } from "@/lib/errors/app-error";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { createArtifactSchema } from "@/lib/validators/api-schemas";
import { ArtifactService } from "@/modules/artifact/artifact-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const projectId = request.nextUrl.searchParams.get("projectId") ?? undefined;

    if (!workspaceId) {
      throw badRequest("workspaceId is required.");
    }

    const artifacts = await new ArtifactService().list(user.id, workspaceId, projectId);
    return successResponse({ artifacts });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = createArtifactSchema.parse(await request.json());
    const artifact = await new ArtifactService().create(user.id, {
      ...body,
      createdById: user.id,
    });
    return successResponse({ artifact }, 201);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
