import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hasMarketplacePii, redactMarketplacePii } from "@/lib/security/redaction";
import { sanitizeUserText } from "@/lib/security/request-context";
import { canManageMarketplace, type UserRole } from "@/modules/identity/role-policy";
import { assertMarketplace } from "@/modules/marketplace/errors";
import { createMarketplaceNotifications } from "@/modules/marketplace/notification-events";

export type CreateMessageThreadInput = {
  actorId: string;
  orderId?: string;
  barterProposalId?: string;
  participantId?: string;
  topic?: string;
};

function compactIds(values: (string | null | undefined)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function notificationTypeForThread(thread: { orderId?: string | null; barterProposalId?: string | null }): NotificationType {
  if (thread.orderId) return "order";
  if (thread.barterProposalId) return "barter";
  return "system";
}

function presentMessage(message: {
  body: string;
  redactedBody: string;
  redactions: unknown;
  [key: string]: unknown;
}) {
  const { redactedBody, redactions, ...safeMessage } = message;
  return {
    ...safeMessage,
    body: redactedBody,
    redacted: Boolean(redactions),
  };
}

function presentThread(thread: {
  messages?: {
    body: string;
    redactedBody: string;
    redactions: unknown;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}) {
  return {
    ...thread,
    messages: (thread.messages ?? []).map(presentMessage),
  };
}

export class MessageService {
  async listThreads(actorId: string) {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, role: true },
    });

    assertMarketplace(actor, "user_not_found", "User account was not found.", 404);

    const threads = await prisma.messageThread.findMany({
      where: canManageMarketplace(actor.role)
        ? { status: { in: ["open", "locked"] } }
        : { participants: { some: { userId: actorId } }, status: { in: ["open", "locked"] } },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        messages: {
          include: { sender: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        order: {
          include: {
            listing: {
              include: {
                brand: true,
                category: true,
                photos: { orderBy: { sortOrder: "asc" }, take: 1 },
              },
            },
          },
        },
        barterProposal: {
          include: {
            targetListing: {
              include: {
                brand: true,
                category: true,
                photos: { orderBy: { sortOrder: "asc" }, take: 1 },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return threads.map(presentThread);
  }

  async getThread(threadId: string, actorId: string) {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, role: true },
    });

    assertMarketplace(actor, "user_not_found", "User account was not found.", 404);

    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        messages: {
          include: { sender: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        order: {
          include: {
            listing: {
              include: {
                brand: true,
                category: true,
                photos: { orderBy: { sortOrder: "asc" }, take: 1 },
              },
            },
            buyer: { select: { id: true, name: true, email: true } },
            seller: { select: { id: true, name: true, email: true, sellerScore: true } },
          },
        },
        barterProposal: {
          include: {
            initiator: { select: { id: true, name: true, email: true } },
            recipient: { select: { id: true, name: true, email: true } },
            targetListing: {
              include: {
                brand: true,
                category: true,
                photos: { orderBy: { sortOrder: "asc" }, take: 1 },
              },
            },
            offeredListings: {
              include: {
                listing: {
                  include: {
                    brand: true,
                    category: true,
                    photos: { orderBy: { sortOrder: "asc" }, take: 1 },
                  },
                },
              },
            },
          },
        },
      },
    });

    assertMarketplace(thread, "thread_not_found", "Message thread was not found.", 404);
    assertMarketplace(
      canManageMarketplace(actor.role) || thread.participants.some((participant) => participant.userId === actorId),
      "forbidden",
      "Only thread participants or support operators can read this thread.",
      403,
    );

    await prisma.messageThreadParticipant.updateMany({
      where: { threadId, userId: actorId },
      data: { lastReadAt: new Date() },
    });

    return presentThread(thread);
  }

  async createThread(input: CreateMessageThreadInput) {
    const actor = await prisma.user.findUnique({
      where: { id: input.actorId },
      select: { id: true, role: true },
    });

    assertMarketplace(actor, "user_not_found", "User account was not found.", 404);
    assertMarketplace(
      [input.orderId, input.barterProposalId, input.participantId].filter(Boolean).length <= 1,
      "invalid_thread_target",
      "Create a thread for one target at a time.",
      422,
    );

    if (input.orderId) {
      return this.createOrderThread(input.actorId, input.orderId, canManageMarketplace(actor.role));
    }

    if (input.barterProposalId) {
      return this.createBarterThread(input.actorId, input.barterProposalId, canManageMarketplace(actor.role));
    }

    return this.createSupportThread(input.actorId, canManageMarketplace(actor.role), input.participantId, input.topic);
  }

  private async createOrderThread(actorId: string, orderId: string, actorCanSupport: boolean) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, buyerId: true, sellerId: true },
    });

    assertMarketplace(order, "order_not_found", "Order was not found.", 404);
    assertMarketplace(
      actorCanSupport || order.buyerId === actorId || order.sellerId === actorId,
      "forbidden",
      "Only order participants or support operators can create this thread.",
      403,
    );

    const existingThread = await prisma.messageThread.findFirst({ where: { orderId: order.id } });
    if (existingThread) return this.getThread(existingThread.id, actorId);

    const participantIds = compactIds([order.buyerId, order.sellerId, actorCanSupport ? actorId : null]);
    const thread = await prisma.$transaction(async (tx) => {
      const createdThread = await tx.messageThread.create({
        data: {
          orderId: order.id,
          metadata: { source: "order", createdById: actorId },
          participants: {
            create: participantIds.map((participantId) => ({
              userId: participantId,
              role:
                participantId === order.buyerId
                  ? "buyer"
                  : participantId === order.sellerId
                    ? "seller"
                    : "support",
            })),
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: "message.thread_created",
          entity: "MessageThread",
          entityId: createdThread.id,
          afterState: { source: "order", orderId: order.id, participantCount: participantIds.length },
        },
      });

      await createMarketplaceNotifications(
        tx,
        participantIds
          .filter((participantId) => participantId !== actorId)
          .map((userId) => ({
            userId,
            type: "order",
            title: "Order conversation opened",
            body: "A BD Select order thread is ready for participant updates.",
            actionUrl: "/inbox",
            metadata: { threadId: createdThread.id, orderId: order.id },
          })),
      );

      return createdThread;
    });

    return this.getThread(thread.id, actorId);
  }

  private async createBarterThread(actorId: string, barterProposalId: string, actorCanSupport: boolean) {
    const proposal = await prisma.barterProposal.findUnique({
      where: { id: barterProposalId },
      select: { id: true, initiatorId: true, recipientId: true },
    });

    assertMarketplace(proposal, "barter_proposal_not_found", "Barter proposal was not found.", 404);
    assertMarketplace(
      actorCanSupport || proposal.initiatorId === actorId || proposal.recipientId === actorId,
      "forbidden",
      "Only barter participants or support operators can create this thread.",
      403,
    );

    const existingThread = await prisma.messageThread.findFirst({
      where: { barterProposalId: proposal.id },
    });
    if (existingThread) return this.getThread(existingThread.id, actorId);

    const participantIds = compactIds([
      proposal.initiatorId,
      proposal.recipientId,
      actorCanSupport ? actorId : null,
    ]);
    const thread = await prisma.$transaction(async (tx) => {
      const createdThread = await tx.messageThread.create({
        data: {
          barterProposalId: proposal.id,
          metadata: { source: "barter", createdById: actorId },
          participants: {
            create: participantIds.map((participantId) => ({
              userId: participantId,
              role:
                participantId === proposal.initiatorId
                  ? "initiator"
                  : participantId === proposal.recipientId
                    ? "recipient"
                    : "support",
            })),
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: "message.thread_created",
          entity: "MessageThread",
          entityId: createdThread.id,
          afterState: {
            source: "barter",
            barterProposalId: proposal.id,
            participantCount: participantIds.length,
          },
        },
      });

      await createMarketplaceNotifications(
        tx,
        participantIds
          .filter((participantId) => participantId !== actorId)
          .map((userId) => ({
            userId,
            type: "barter",
            title: "Barter conversation opened",
            body: "A BD Select swap thread is ready for negotiation and support updates.",
            actionUrl: "/inbox",
            metadata: { threadId: createdThread.id, barterProposalId: proposal.id },
          })),
      );

      return createdThread;
    });

    return this.getThread(thread.id, actorId);
  }

  private async createSupportThread(
    actorId: string,
    actorCanSupport: boolean,
    participantId?: string,
    topic?: string,
  ) {
    if (actorCanSupport) {
      assertMarketplace(
        participantId,
        "invalid_thread_target",
        "Support operators must choose a participant for a support thread.",
        422,
      );
    }

    let participant: { id: string; role: UserRole } | null = null;
    if (actorCanSupport) {
      participant = await prisma.user.findUnique({
        where: { id: participantId },
        select: { id: true, role: true },
      });
    } else {
      participant = await prisma.user.findFirst({
        where: { role: { in: ["admin", "super_admin"] } },
        select: { id: true, role: true },
      });
    }

    assertMarketplace(participant, "support_participant_not_found", "Support participant was not found.", 404);
    assertMarketplace(participant.id !== actorId, "invalid_thread_target", "Support threads require two users.", 422);

    const participantRole = actorCanSupport
      ? participant.role === "seller"
        ? "seller"
        : participant.role === "authenticator"
          ? "authenticator"
        : "buyer"
      : "support";
    const threadTopic = topic ? sanitizeUserText(topic) : "Support request";

    const thread = await prisma.$transaction(async (tx) => {
      const createdThread = await tx.messageThread.create({
        data: {
          metadata: { source: "support", topic: threadTopic, createdById: actorId },
          participants: {
            create: [
              { userId: actorId, role: actorCanSupport ? "support" : "buyer" },
              { userId: participant.id, role: participantRole },
            ],
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: "message.thread_created",
          entity: "MessageThread",
          entityId: createdThread.id,
          afterState: {
            source: "support",
            participantId: participant.id,
            participantCount: 2,
          },
        },
      });

      await createMarketplaceNotifications(tx, [
        {
          userId: participant.id,
          type: "system",
          title: "Support conversation opened",
          body: "A BD Select support thread is ready in your inbox.",
          actionUrl: "/inbox",
          metadata: { threadId: createdThread.id, source: "support" },
        },
      ]);

      return createdThread;
    });

    return this.getThread(thread.id, actorId);
  }

  async sendMessage(threadId: string, senderId: string, body: string) {
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true, role: true },
    });

    assertMarketplace(sender, "sender_not_found", "Sender account was not found.", 404);

    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      include: { participants: true },
    });

    assertMarketplace(thread, "thread_not_found", "Message thread was not found.", 404);
    assertMarketplace(thread.status === "open", "thread_locked", "Message thread is not open.", 409);

    const isParticipant = thread.participants.some((participant) => participant.userId === senderId);
    if (!isParticipant && canManageMarketplace(sender.role)) {
      await prisma.messageThreadParticipant.create({
        data: { threadId, userId: senderId, role: "support" },
      });
    } else {
      assertMarketplace(isParticipant, "forbidden", "Only thread participants can send messages.", 403);
    }

    const cleanBody = sanitizeUserText(body);
    const redactedBody = redactMarketplacePii(cleanBody);
    const redactions = hasMarketplacePii(cleanBody) ? { marketplacePii: true } : undefined;

    const message = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          threadId,
          senderId,
          body: cleanBody,
          redactedBody,
          redactions,
        },
        include: { sender: { select: { id: true, name: true, email: true, role: true } } },
      });

      await tx.messageThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          actorId: senderId,
          action: "message.sent",
          entity: "Message",
          entityId: createdMessage.id,
          metadata: {
            threadId,
            redacted: Boolean(redactions),
            bodyLength: cleanBody.length,
          },
        },
      });

      await createMarketplaceNotifications(
        tx,
        thread.participants
          .filter((participant) => participant.userId !== senderId)
          .map((participant) => ({
            userId: participant.userId,
            type: notificationTypeForThread(thread),
            title: "New message in BD Select",
            body: "A participant replied in a protected marketplace thread.",
            actionUrl: "/inbox",
            metadata: {
              threadId,
              ...(thread.orderId ? { orderId: thread.orderId } : {}),
              ...(thread.barterProposalId ? { barterProposalId: thread.barterProposalId } : {}),
              redacted: Boolean(redactions),
            },
          })),
      );

      return createdMessage;
    });

    return presentMessage(message);
  }
}
