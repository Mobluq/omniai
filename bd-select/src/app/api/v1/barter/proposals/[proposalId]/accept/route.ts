import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { BarterService } from "@/modules/marketplace/barter-service";
import { marketplaceFailure } from "@/modules/marketplace/response";

const barterService = new BarterService();

type BarterRouteContext = {
  params: Promise<{ proposalId: string }>;
};

export async function POST(request: Request, context: BarterRouteContext) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const { proposalId } = await context.params;

  try {
    return ok({ proposal: await barterService.acceptProposal(currentUser.user.id, proposalId) });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
