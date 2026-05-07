import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { MediaService } from "@/modules/marketplace/media-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { requestUploadTicketSchema } from "@/modules/marketplace/schemas";

const mediaService = new MediaService();

export async function POST(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, requestUploadTicketSchema);
  if (!body.ok) return body.response;

  try {
    return ok(
      await mediaService.requestUploadTicket({
        ownerId: currentUser.user.id,
        ...body.data,
      }),
      { status: 201 },
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}
