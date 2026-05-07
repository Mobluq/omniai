import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { LogisticsService } from "@/modules/marketplace/logistics-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { recordShipmentEventSchema } from "@/modules/marketplace/schemas";

const logisticsService = new LogisticsService();

type ShipmentEventRouteContext = {
  params: Promise<{ shipmentId: string }>;
};

export async function POST(request: Request, context: ShipmentEventRouteContext) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, recordShipmentEventSchema);
  if (!body.ok) return body.response;

  const { shipmentId } = await context.params;

  try {
    return ok({
      result: await logisticsService.recordShipmentEvent({
        actorId: currentUser.user.id,
        shipmentId,
        ...body.data,
      }),
    });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
