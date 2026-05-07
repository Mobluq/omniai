import type { NotificationType, Prisma } from "@prisma/client";

export type MarketplaceNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Prisma.InputJsonObject;
};

export async function createMarketplaceNotifications(
  tx: Prisma.TransactionClient,
  notifications: MarketplaceNotificationInput[],
) {
  const deduped = notifications.filter(
    (notification, index, allNotifications) =>
      allNotifications.findIndex(
        (candidate) =>
          candidate.userId === notification.userId &&
          candidate.type === notification.type &&
          candidate.title === notification.title &&
          candidate.actionUrl === notification.actionUrl,
      ) === index,
  );

  if (deduped.length === 0) return;

  await tx.notification.createMany({
    data: deduped.map((notification) => ({
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      actionUrl: notification.actionUrl,
      metadata: notification.metadata,
    })),
  });
}
