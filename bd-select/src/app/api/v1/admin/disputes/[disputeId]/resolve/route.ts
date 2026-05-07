import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { OperationsService } from "@/modules/marketplace/operations-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { resolveDisputeSchema } from "@/modules/marketplace/schemas";

const operationsService = new OperationsService();

type DisputeRouteContext = {
  params: Promise<{ disputeId: string }>;
};

export async function POST(request: Request, context: DisputeRouteContext) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, resolveDisputeSchema);
  if (!body.ok) return body.response;

  const { disputeId } = await context.params;

  try {
    return ok(
      await operationsService.resolveDispute({
        adminId: currentUser.user.id,
        disputeId,
        ...body.data,
      }),
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}
