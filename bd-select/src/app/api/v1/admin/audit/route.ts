import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { AuditService } from "@/modules/marketplace/audit-service";
import { isAuditSignedFilter } from "@/modules/marketplace/audit-policy";
import { marketplaceFailure } from "@/modules/marketplace/response";

const auditService = new AuditService();

export async function GET(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const url = new URL(request.url);
  const signedParam = url.searchParams.get("signed");
  const takeParam = Number(url.searchParams.get("take") ?? 100);
  const signed = isAuditSignedFilter(signedParam) ? signedParam : "all";
  const action = url.searchParams.get("action")?.trim() || undefined;
  const entity = url.searchParams.get("entity")?.trim() || undefined;

  try {
    return ok(
      await auditService.listAuditLogs({
        adminId: currentUser.user.id,
        action,
        entity,
        signed,
        take: Number.isFinite(takeParam) ? takeParam : 100,
      }),
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}
