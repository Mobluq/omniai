import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { OperationsService } from "@/modules/marketplace/operations-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { transitionPayoutSchema } from "@/modules/marketplace/schemas";

const operationsService = new OperationsService();

type PayoutRouteContext = {
  params: Promise<{ payoutId: string }>;
};

export async function POST(request: Request, context: PayoutRouteContext) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, transitionPayoutSchema);
  if (!body.ok) return body.response;

  const { payoutId } = await context.params;

  try {
    return ok(
      await operationsService.transitionPayout({
        adminId: currentUser.user.id,
        payoutId,
        ...body.data,
      }),
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}
