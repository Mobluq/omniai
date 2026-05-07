import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { MediaService } from "@/modules/marketplace/media-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { completeUploadSchema } from "@/modules/marketplace/schemas";

const mediaService = new MediaService();

type MediaRouteContext = {
  params: Promise<{ assetId: string }>;
};

export async function POST(request: Request, context: MediaRouteContext) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, completeUploadSchema);
  if (!body.ok) return body.response;

  const { assetId } = await context.params;

  try {
    return ok({
      asset: await mediaService.completeUpload({
        ownerId: currentUser.user.id,
        assetId,
        ...body.data,
      }),
    });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
