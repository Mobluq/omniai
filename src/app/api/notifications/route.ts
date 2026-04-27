import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { notificationListQuerySchema } from "@/lib/validators/api-schemas";
import { NotificationService } from "@/modules/notification/notification-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const query = notificationListQuerySchema.parse({
      workspaceId: request.nextUrl.searchParams.get("workspaceId") ?? undefined,
      unreadOnly: request.nextUrl.searchParams.get("unreadOnly") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });
    const notifications = await new NotificationService().list({
      userId: user.id,
      workspaceId: query.workspaceId,
      unreadOnly: query.unreadOnly,
      limit: query.limit,
    });
    return successResponse({ notifications });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    await assertRateLimit({
      scope: "notifications.mark_all_read",
      key: `${user.id}:${getClientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });
    const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? undefined;
    const result = await new NotificationService().markAllRead({ userId: user.id, workspaceId });
    return successResponse(result);
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
