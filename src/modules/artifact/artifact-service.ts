import type { ArtifactType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "@/lib/errors/app-error";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";
import { ProjectService } from "@/modules/project/project-service";

export type CreateArtifactInput = {
  workspaceId: string;
  projectId?: string;
  conversationId?: string;
  messageId?: string;
  createdById?: string;
  type: ArtifactType;
  title: string;
  content: string;
  provider?: string;
  modelId?: string;
  metadata?: Prisma.InputJsonValue;
};

function inferArtifactType(content: string, provider?: string): ArtifactType {
  if (/!\[[^\]]*\]\((data:image\/|https?:\/\/)/i.test(content)) {
    return "image";
  }

  if (/```/.test(content)) {
    return "code";
  }

  if (/proposal|statement of work|scope of work|pricing/i.test(content)) {
    return "proposal";
  }

  if (/sources|references|market|research|analysis/i.test(content)) {
    return "research";
  }

  return provider ? "document" : "other";
}

function buildTitle(content: string, fallback: string) {
  const firstLine = content
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return (firstLine ?? fallback).slice(0, 120);
}

export class ArtifactService {
  private readonly projects = new ProjectService();

  async list(userId: string, workspaceId: string, projectId?: string) {
    await assertWorkspaceAccess(userId, workspaceId);

    if (projectId) {
      await this.projects.assertProjectInWorkspace(userId, projectId, workspaceId);
    }

    return prisma.artifact.findMany({
      where: {
        workspaceId,
        projectId,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async create(userId: string, input: CreateArtifactInput) {
    await assertWorkspaceAccess(userId, input.workspaceId, "member");

    if (input.projectId) {
      await this.projects.assertProjectInWorkspace(userId, input.projectId, input.workspaceId);
    }

    return prisma.artifact.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        createdById: input.createdById ?? userId,
        type: input.type,
        title: input.title,
        content: input.content,
        provider: input.provider,
        modelId: input.modelId,
        metadata: input.metadata,
      },
    });
  }

  async get(userId: string, artifactId: string) {
    const artifact = await prisma.artifact.findFirst({
      where: {
        id: artifactId,
        workspace: {
          members: {
            some: { userId },
          },
        },
      },
    });

    if (!artifact) {
      throw notFound("Artifact not found.");
    }

    return artifact;
  }

  async delete(userId: string, artifactId: string) {
    const artifact = await this.get(userId, artifactId);
    await assertWorkspaceAccess(userId, artifact.workspaceId, "member");

    return prisma.artifact.delete({
      where: { id: artifactId },
    });
  }

  async createFromAssistantMessage(input: {
    userId: string;
    workspaceId: string;
    projectId?: string | null;
    conversationId: string;
    messageId: string;
    content: string;
    provider?: string | null;
    modelId?: string | null;
  }) {
    const type = inferArtifactType(input.content, input.provider ?? undefined);
    const shouldSave =
      type === "image" ||
      type === "code" ||
      type === "proposal" ||
      type === "research" ||
      input.content.length > 800;

    if (!shouldSave) {
      return null;
    }

    return this.create(input.userId, {
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? undefined,
      conversationId: input.conversationId,
      messageId: input.messageId,
      createdById: input.userId,
      type,
      title: buildTitle(input.content, "Generated artifact"),
      content: input.content,
      provider: input.provider ?? undefined,
      modelId: input.modelId ?? undefined,
      metadata: { generatedFrom: "assistant_message" },
    });
  }
}
