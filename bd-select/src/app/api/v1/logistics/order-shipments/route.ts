import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { LogisticsService } from "@/modules/marketplace/logistics-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { createOrderShipmentSchema } from "@/modules/marketplace/schemas";

const logisticsService = new LogisticsService();

export async function POST(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, createOrderShipmentSchema);
  if (!body.ok) return body.response;

  try {
    return ok(
      await logisticsService.createOrderShipment({
        actorId: currentUser.user.id,
        ...body.data,
      }),
      { status: 201 },
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}
