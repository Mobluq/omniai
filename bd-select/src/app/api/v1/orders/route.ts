import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { OrderService } from "@/modules/marketplace/order-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { createOrderSchema } from "@/modules/marketplace/schemas";

const orderService = new OrderService();

export async function POST(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, createOrderSchema);
  if (!body.ok) return body.response;

  try {
    return ok(
      await orderService.createOrder({
        buyerId: currentUser.user.id,
        ...body.data,
      }),
      { status: 201 },
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}

export async function GET(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  try {
    return ok({ orders: await orderService.listForUser(currentUser.user.id) });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
