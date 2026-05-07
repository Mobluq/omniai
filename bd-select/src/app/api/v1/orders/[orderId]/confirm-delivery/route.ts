import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { OrderService } from "@/modules/marketplace/order-service";
import { marketplaceFailure } from "@/modules/marketplace/response";

const orderService = new OrderService();

type OrderRouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: Request, context: OrderRouteContext) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const { orderId } = await context.params;

  try {
    return ok({ order: await orderService.confirmDelivery(currentUser.user.id, orderId) });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
