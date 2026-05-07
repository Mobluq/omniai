import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import type { Prisma } from "@prisma/client";
import { OrderService } from "@/modules/marketplace/order-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { openDisputeSchema } from "@/modules/marketplace/schemas";

const orderService = new OrderService();

type OrderRouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: Request, context: OrderRouteContext) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, openDisputeSchema);
  if (!body.ok) return body.response;

  const { orderId } = await context.params;

  try {
    return ok(
      await orderService.openDispute({
        actorId: currentUser.user.id,
        orderId,
        reasonCode: body.data.reasonCode,
        evidence: body.data.evidence as Prisma.InputJsonObject | undefined,
      }),
      { status: 201 },
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}
