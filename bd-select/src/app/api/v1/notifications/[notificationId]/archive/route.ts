import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { NotificationService } from "@/modules/marketplace/notification-service";
import { marketplaceFailure } from "@/modules/marketplace/response";

const notificationService = new NotificationService();

type NotificationRouteContext = {
  params: Promise<{ notificationId: string }>;
};

export async function POST(request: Request, context: NotificationRouteContext) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const { notificationId } = await context.params;

  try {
    return ok({ notification: await notificationService.archive(currentUser.user.id, notificationId) });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
