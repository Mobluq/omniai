import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { GrowthService } from "@/modules/marketplace/growth-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { createListingPromotionSchema } from "@/modules/marketplace/schemas";

const growthService = new GrowthService();

export async function POST(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, createListingPromotionSchema);
  if (!body.ok) return body.response;

  try {
    return ok(
      {
        promotion: await growthService.createListingPromotion({
          sellerId: currentUser.user.id,
          ...body.data,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}
