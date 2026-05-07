import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { NotificationService } from "@/modules/marketplace/notification-service";
import { marketplaceFailure } from "@/modules/marketplace/response";

const notificationService = new NotificationService();

export async function POST(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  try {
    return ok({ notifications: await notificationService.markAllRead(currentUser.user.id) });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
