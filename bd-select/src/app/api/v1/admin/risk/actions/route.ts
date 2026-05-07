import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { RiskService } from "@/modules/marketplace/risk-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { applyRiskActionSchema } from "@/modules/marketplace/schemas";

const riskService = new RiskService();

export async function POST(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, applyRiskActionSchema);
  if (!body.ok) return body.response;

  try {
    return ok({
      result: await riskService.applyAction({
        adminId: currentUser.user.id,
        ...body.data,
      }),
    });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
