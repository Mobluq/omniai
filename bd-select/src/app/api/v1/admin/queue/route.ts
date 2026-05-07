import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { ReviewService } from "@/modules/marketplace/review-service";

const reviewService = new ReviewService();

export async function GET(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  try {
    return ok({ queue: await reviewService.listQueue(currentUser.user.id) });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
