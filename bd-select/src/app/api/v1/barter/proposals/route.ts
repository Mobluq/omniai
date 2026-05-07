import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { BarterService } from "@/modules/marketplace/barter-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { createBarterProposalSchema } from "@/modules/marketplace/schemas";

const barterService = new BarterService();

export async function GET(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  try {
    return ok({ proposals: await barterService.listForUser(currentUser.user.id) });
  } catch (error) {
    return marketplaceFailure(error);
  }
}

export async function POST(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, createBarterProposalSchema);
  if (!body.ok) return body.response;

  try {
    return ok(
      await barterService.createProposal({
        initiatorId: currentUser.user.id,
        ...body.data,
      }),
      { status: 201 },
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}
