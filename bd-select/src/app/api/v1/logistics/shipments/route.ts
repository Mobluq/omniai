import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { LogisticsService } from "@/modules/marketplace/logistics-service";
import { marketplaceFailure } from "@/modules/marketplace/response";

const logisticsService = new LogisticsService();

export async function GET(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  try {
    return ok(await logisticsService.workspace(currentUser.user.id));
  } catch (error) {
    return marketplaceFailure(error);
  }
}
