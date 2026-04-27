import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { badRequest } from "@/lib/errors/app-error";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { createKnowledgeSourceSchema } from "@/lib/validators/api-schemas";
import { KnowledgeService } from "@/modules/knowledge/knowledge-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const projectId = request.nextUrl.searchParams.get("projectId") ?? undefined;

    if (!workspaceId) {
      throw badRequest("workspaceId is required.");
    }

    const knowledgeSources = await new KnowledgeService().list(user.id, workspaceId, projectId);
    return successResponse({ knowledgeSources });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = createKnowledgeSourceSchema.parse(await request.json());
    const knowledgeSource = await new KnowledgeService().create(user.id, body);
    return successResponse({ knowledgeSource }, 201);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
