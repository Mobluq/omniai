import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { MessageService } from "@/modules/marketplace/message-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { sendMessageSchema } from "@/modules/marketplace/schemas";

const messageService = new MessageService();

type ThreadMessagesRouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function POST(request: Request, context: ThreadMessagesRouteContext) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, sendMessageSchema);
  if (!body.ok) return body.response;

  const { threadId } = await context.params;

  try {
    return ok(
      {
        message: await messageService.sendMessage(threadId, currentUser.user.id, body.data.body),
      },
      { status: 201 },
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}
