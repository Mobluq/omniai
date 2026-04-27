import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { createConversationSchema } from "@/lib/validators/api-schemas";
import { ConversationService } from "@/modules/conversation/conversation-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? undefined;
    const conversations = await new ConversationService().list(user.id, workspaceId);
    return successResponse({ conversations });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = createConversationSchema.parse(await request.json());
    const conversation = await new ConversationService().create(user.id, {
      workspaceId: body.workspaceId,
      projectId: body.projectId,
      title: body.title,
      routingMode: body.routingMode,
      provider: body.provider,
      modelId: body.modelId,
    });

    return successResponse({ conversation }, 201);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
