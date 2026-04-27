import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { AccountService } from "@/modules/account/account-service";

export async function GET() {
  try {
    const user = await requireUser();
    const security = await new AccountService().getSecurityOverview(user.id);
    return successResponse({ security });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
