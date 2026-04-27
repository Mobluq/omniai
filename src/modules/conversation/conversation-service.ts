import type { MessageRole, Prisma, RoutingMode } from "@prisma/client";
import { notFound } from "@/lib/errors/app-error";
import { prisma } from "@/lib/db/prisma";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";

export type CreateConversationInput = {
  workspaceId: string;
  projectId?: string;
  title?: string;
  routingMode: RoutingMode;
  provider?: string;
  modelId?: string;
};

export type CreateMessageInput = {
  conversationId: string;
  workspaceId: string;
  userId?: string;
  role: MessageRole;
  content: string;
  provider?: string;
  modelId?: string;
  modelDisplayName?: string;
  tokenInput?: number;
  tokenOutput?: number;
  costEstimate?: number;
  metadata?: Prisma.InputJsonValue;
};

export class ConversationService {
  async list(userId: string, workspaceId?: string) {
    if (workspaceId) {
      await assertWorkspaceAccess(userId, workspaceId);
    }

    return prisma.conversation.findMany({
      where: {
        archivedAt: null,
        workspaceId,
        workspace: {
          members: {
            some: { userId },
          },
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
  }

  async create(userId: string, input: CreateConversationInput) {
    await assertWorkspaceAccess(userId, input.workspaceId, "member");

    return prisma.conversation.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        createdById: userId,
        title: input.title ?? "New conversation",
        routingMode: input.routingMode,
        activeProvider: input.provider,
        activeModelId: input.modelId,
      },
    });
  }

  async get(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        workspace: {
          members: {
            some: { userId },
          },
        },
      },
      include: {
        project: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      throw notFound("Conversation not found.");
    }

    return conversation;
  }

  async getUserMessage(userId: string, conversationId: string, messageId: string) {
    await this.get(userId, conversationId);
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId,
        role: "user",
      },
    });

    if (!message) {
      throw notFound("Message not found.");
    }

    return message;
  }

  async delete(userId: string, conversationId: string) {
    const conversation = await this.get(userId, conversationId);
    await assertWorkspaceAccess(userId, conversation.workspaceId, "member");

    return prisma.conversation.update({
      where: { id: conversationId },
      data: { archivedAt: new Date() },
    });
  }

  async addMessage(input: CreateMessageInput) {
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: input.conversationId,
          workspaceId: input.workspaceId,
          userId: input.userId,
          role: input.role,
          content: input.content,
          provider: input.provider,
          modelId: input.modelId,
          modelDisplayName: input.modelDisplayName,
          tokenInput: input.tokenInput,
          tokenOutput: input.tokenOutput,
          costEstimate: input.costEstimate,
          metadata: input.metadata,
        },
      }),
      prisma.conversation.update({
        where: { id: input.conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return message;
  }

  async renameFromPrompt(conversationId: string, prompt: string) {
    const title = prompt
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 72);

    if (!title) {
      return null;
    }

    return prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    });
  }
}
