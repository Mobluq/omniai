import { requireCurrentUser } from "@/lib/auth/current-user";
import { fail, ok } from "@/lib/errors/api-response";
import { InsightsService } from "@/modules/marketplace/insights-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { reportingRangeSchema } from "@/modules/marketplace/schemas";

const insightsService = new InsightsService();

export async function GET(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "30d";
  const parsedRange = reportingRangeSchema.safeParse(range);

  if (!parsedRange.success) {
    return fail("invalid_reporting_range", "Reporting range filter is invalid.", 422);
  }

  try {
    return ok(
      await insightsService.getAdminInsights({
        adminId: currentUser.user.id,
        range: parsedRange.data,
      }),
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}
