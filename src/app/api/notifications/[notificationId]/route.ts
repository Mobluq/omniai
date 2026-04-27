import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { notificationUpdateSchema } from "@/lib/validators/api-schemas";
import { NotificationService } from "@/modules/notification/notification-service";

type Context = {
  params: Promise<{ notificationId: string }> | { notificationId: string };
};

export async function PATCH(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    await assertRateLimit({
      scope: "notifications.update",
      key: `${user.id}:${getClientIp(request)}`,
      limit: 60,
      windowMs: 60_000,
    });
    const { notificationId } = await context.params;
    const body = notificationUpdateSchema.parse(await request.json());
    const notification = await new NotificationService().update(user.id, notificationId, body);
    return successResponse({ notification });
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
