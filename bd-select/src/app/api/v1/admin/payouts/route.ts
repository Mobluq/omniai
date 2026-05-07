import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { OperationsService } from "@/modules/marketplace/operations-service";
import { marketplaceFailure } from "@/modules/marketplace/response";

const operationsService = new OperationsService();

export async function GET(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  try {
    return ok({ payouts: await operationsService.listPayouts(currentUser.user.id) });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
