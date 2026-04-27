import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { ArtifactService } from "@/modules/artifact/artifact-service";

type Context = {
  params: Promise<{ artifactId: string }> | { artifactId: string };
};

export async function GET(_request: NextRequest, context: Context) {
  try {
    const user = await requireUser();
    const { artifactId } = await context.params;
    const artifact = await new ArtifactService().get(user.id, artifactId);
    return successResponse({ artifact });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const user = await requireUser();
    const { artifactId } = await context.params;
    const artifact = await new ArtifactService().delete(user.id, artifactId);
    return successResponse({ artifact });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
