import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { EvidenceService } from "@/modules/marketplace/evidence-service";
import { marketplaceFailure } from "@/modules/marketplace/response";

const evidenceService = new EvidenceService();

export async function GET(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  try {
    return ok({ disputes: await evidenceService.listForUser({ actorId: currentUser.user.id }) });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
