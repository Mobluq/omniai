import { requireCurrentUser } from "@/lib/auth/current-user";
import { fail, ok } from "@/lib/errors/api-response";
import { RiskService } from "@/modules/marketplace/risk-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { riskCategorySchema, riskSeveritySchema } from "@/modules/marketplace/schemas";

const riskService = new RiskService();

export async function GET(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const severity = searchParams.get("severity") || undefined;

  const parsedCategory = category ? riskCategorySchema.safeParse(category) : null;
  const parsedSeverity = severity ? riskSeveritySchema.safeParse(severity) : null;

  if (parsedCategory && !parsedCategory.success) {
    return fail("invalid_risk_category", "Risk category filter is invalid.", 422);
  }
  if (parsedSeverity && !parsedSeverity.success) {
    return fail("invalid_risk_severity", "Risk severity filter is invalid.", 422);
  }

  try {
    return ok(
      await riskService.listCases({
        adminId: currentUser.user.id,
        category: parsedCategory?.data,
        severity: parsedSeverity?.data,
      }),
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}
