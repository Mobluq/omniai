import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { MessageService } from "@/modules/marketplace/message-service";
import { marketplaceFailure } from "@/modules/marketplace/response";

const messageService = new MessageService();

type ThreadRouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function GET(request: Request, context: ThreadRouteContext) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const { threadId } = await context.params;

  try {
    return ok({ thread: await messageService.getThread(threadId, currentUser.user.id) });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
