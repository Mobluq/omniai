import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { KycService } from "@/modules/identity/kyc-service";
import { upsertSellerProfileSchema } from "@/modules/identity/schemas";
import { marketplaceFailure } from "@/modules/marketplace/response";

const kycService = new KycService();

export async function POST(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, upsertSellerProfileSchema);
  if (!body.ok) return body.response;

  try {
    return ok(await kycService.upsertSellerProfile({ userId: currentUser.user.id, ...body.data }), {
      status: 201,
    });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
