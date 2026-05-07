import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { GrowthService } from "@/modules/marketplace/growth-service";
import { marketplaceFailure } from "@/modules/marketplace/response";

const growthService = new GrowthService();

export async function GET(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  try {
    return ok(await growthService.getSellerGrowth(currentUser.user.id));
  } catch (error) {
    return marketplaceFailure(error);
  }
}
