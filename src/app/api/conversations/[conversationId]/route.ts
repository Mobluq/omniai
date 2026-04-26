import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { ConversationService } from "@/modules/conversation/conversation-service";

type Context = {
  params: Promise<{ conversationId: string }> | { conversationId: string };
};

export async function GET(_request: NextRequest, context: Context) {
  try {
    const user = await requireUser();
    const { conversationId } = await context.params;
    const conversation = await new ConversationService().get(user.id, conversationId);
    return successResponse({ conversation });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const user = await requireUser();
    const { conversationId } = await context.params;
    const conversation = await new ConversationService().delete(user.id, conversationId);
    return successResponse({ conversation });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
