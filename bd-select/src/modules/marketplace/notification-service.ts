import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertMarketplace } from "@/modules/marketplace/errors";
import type { NotificationStatusFilter } from "@/modules/marketplace/notification-policy";

export type ListNotificationsOptions = {
  status?: NotificationStatusFilter;
  type?: NotificationType;
};

function notificationWhere(userId: string, options: ListNotificationsOptions): Prisma.NotificationWhereInput {
  const where: Prisma.NotificationWhereInput = { userId };

  if (options.type) {
    where.type = options.type;
  }

  if (!options.status || options.status === "active") {
    where.archivedAt = null;
  }

  if (options.status === "unread") {
    where.archivedAt = null;
    where.readAt = null;
  }

  if (options.status === "read") {
    where.archivedAt = null;
    where.readAt = { not: null };
  }

  if (options.status === "archived") {
    where.archivedAt = { not: null };
  }

  return where;
}

export class NotificationService {
  async listForUser(userId: string, options: ListNotificationsOptions = {}) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    assertMarketplace(user, "user_not_found", "User account was not found.", 404);

    return prisma.notification.findMany({
      where: notificationWhere(userId, options),
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    assertMarketplace(notification, "notification_not_found", "Notification was not found.", 404);

    if (notification.readAt) return notification;

    return prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, readAt: null, archivedAt: null },
      data: { readAt: new Date() },
    });

    return this.listForUser(userId);
  }

  async archive(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    assertMarketplace(notification, "notification_not_found", "Notification was not found.", 404);

    const now = new Date();
    return prisma.notification.update({
      where: { id: notification.id },
      data: {
        readAt: notification.readAt ?? now,
        archivedAt: now,
      },
    });
  }
}
