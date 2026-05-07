import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import type { Prisma } from "@prisma/client";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { ReviewService } from "@/modules/marketplace/review-service";
import { decideReviewQueueItemSchema } from "@/modules/marketplace/schemas";

const reviewService = new ReviewService();

type QueueRouteContext = {
  params: Promise<{ queueItemId: string }>;
};

export async function POST(request: Request, context: QueueRouteContext) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, decideReviewQueueItemSchema);
  if (!body.ok) return body.response;

  const { queueItemId } = await context.params;

  try {
    return ok(
      await reviewService.decide({
        reviewerId: currentUser.user.id,
        queueItemId,
        decision: body.data.decision,
        decisionReason: body.data.decisionReason,
        aiSignals: body.data.aiSignals as Prisma.InputJsonObject | undefined,
      }),
    );
  } catch (error) {
    return marketplaceFailure(error);
  }
}
