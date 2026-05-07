import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { NotificationService } from "@/modules/marketplace/notification-service";
import {
  isNotificationStatusFilter,
  isNotificationType,
} from "@/modules/marketplace/notification-policy";
import { marketplaceFailure } from "@/modules/marketplace/response";

const notificationService = new NotificationService();

export async function GET(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const typeParam = url.searchParams.get("type");
  const status = isNotificationStatusFilter(statusParam) ? statusParam : "active";
  const type = isNotificationType(typeParam) ? typeParam : undefined;

  try {
    return ok({
      notifications: await notificationService.listForUser(currentUser.user.id, { status, type }),
      status,
      type,
    });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
