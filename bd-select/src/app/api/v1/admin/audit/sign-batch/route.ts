import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { AuditService } from "@/modules/marketplace/audit-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { signAuditBatchSchema } from "@/modules/marketplace/schemas";

const auditService = new AuditService();

export async function POST(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, signAuditBatchSchema);
  if (!body.ok) return body.response;

  try {
    return ok(await auditService.signUnsignedBatch({ adminId: currentUser.user.id, ...body.data }));
  } catch (error) {
    return marketplaceFailure(error);
  }
}
