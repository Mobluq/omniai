import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { OrderService } from "@/modules/marketplace/order-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { shipOrderSchema } from "@/modules/marketplace/schemas";

const orderService = new OrderService();

type OrderRouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: Request, context: OrderRouteContext) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, shipOrderSchema);
  if (!body.ok) return body.response;

  const { orderId } = await context.params;

  try {
    return ok(
      await orderService.shipOrder({
        actorId: currentUser.user.id,
        orderId,
        ...body.data,
      }),
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}
