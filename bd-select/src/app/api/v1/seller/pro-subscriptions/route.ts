import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { GrowthService } from "@/modules/marketplace/growth-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { activateProSubscriptionSchema } from "@/modules/marketplace/schemas";

const growthService = new GrowthService();

export async function POST(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, activateProSubscriptionSchema);
  if (!body.ok) return body.response;

  try {
    return ok(
      {
        subscription: await growthService.activateProSubscription({
          sellerId: currentUser.user.id,
          tier: body.data.tier,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}
