import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { EvidenceService } from "@/modules/marketplace/evidence-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { requestEvidenceUploadTicketSchema } from "@/modules/marketplace/schemas";

const evidenceService = new EvidenceService();

export async function POST(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, requestEvidenceUploadTicketSchema);
  if (!body.ok) return body.response;

  try {
    return ok(
      await evidenceService.requestUploadTicket({
        actorId: currentUser.user.id,
        ...body.data,
      }),
      { status: 201 },
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}
