import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { sendMessageSchema } from "@/lib/validators/api-schemas";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { ChatOrchestrator } from "@/modules/conversation/chat-orchestrator";

type Context = {
  params: Promise<{ conversationId: string }> | { conversationId: string };
};

export async function POST(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    await assertRateLimit({
      scope: "conversation.message",
      key: `${user.id}:${getClientIp(request)}`,
      limit: 40,
      windowMs: 60_000,
    });
    const { conversationId } = await context.params;
    const body = sendMessageSchema.parse(await request.json());
    const result = await new ChatOrchestrator().sendMessage(user.id, conversationId, body);
    return successResponse(result, result.assistantMessage ? 201 : 202);
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
