import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "@/lib/errors/app-error";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";

export type CreateNotificationInput = {
  userId: string;
  workspaceId?: string | null;
  type?: NotificationType;
  title: string;
  body: string;
  actionUrl?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export class NotificationService {
  async create(input: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        userId: input.userId,
        workspaceId: input.workspaceId,
        type: input.type ?? "system",
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl,
        metadata: input.metadata,
      },
    });
  }

  async list(input: {
    userId: string;
    workspaceId?: string;
    unreadOnly?: boolean;
    limit?: number;
  }) {
    if (input.workspaceId) {
      await assertWorkspaceAccess(input.userId, input.workspaceId);
    }

    const where = {
      userId: input.userId,
      archivedAt: null,
      ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
      ...(input.unreadOnly ? { readAt: null } : {}),
    };

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit ?? 20,
      }),
      prisma.notification.count({
        where: {
          userId: input.userId,
          archivedAt: null,
          readAt: null,
          ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
        },
      }),
    ]);

    return { items, unreadCount };
  }

  async update(
    userId: string,
    notificationId: string,
    input: { read?: boolean; archived?: boolean },
  ) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw notFound("Notification not found.");
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        readAt: input.read === undefined ? undefined : input.read ? new Date() : null,
        archivedAt:
          input.archived === undefined ? undefined : input.archived ? new Date() : null,
      },
    });
  }

  async markAllRead(input: { userId: string; workspaceId?: string }) {
    if (input.workspaceId) {
      await assertWorkspaceAccess(input.userId, input.workspaceId);
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId: input.userId,
        readAt: null,
        archivedAt: null,
        ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
      },
      data: { readAt: new Date() },
    });

    return { updatedCount: result.count };
  }
}
