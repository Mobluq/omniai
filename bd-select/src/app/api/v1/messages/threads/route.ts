import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { MessageService } from "@/modules/marketplace/message-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { createMessageThreadSchema } from "@/modules/marketplace/schemas";

const messageService = new MessageService();

export async function GET(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  try {
    return ok({ threads: await messageService.listThreads(currentUser.user.id) });
  } catch (error) {
    return marketplaceFailure(error);
  }
}

export async function POST(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, createMessageThreadSchema);
  if (!body.ok) return body.response;

  try {
    return ok(
      {
        thread: await messageService.createThread({
          actorId: currentUser.user.id,
          ...body.data,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}
