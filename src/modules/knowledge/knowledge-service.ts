import type { KnowledgeSourceType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";
import { MemoryService } from "@/modules/memory/memory-service";
import { ProjectService } from "@/modules/project/project-service";

export type CreateKnowledgeInput = {
  workspaceId: string;
  projectId?: string;
  type: KnowledgeSourceType;
  title: string;
  sourceUri?: string;
  content: string;
};

export class KnowledgeService {
  private readonly memory = new MemoryService();
  private readonly projects = new ProjectService();

  async list(userId: string, workspaceId: string, projectId?: string) {
    await assertWorkspaceAccess(userId, workspaceId);

    if (projectId) {
      await this.projects.assertProjectInWorkspace(userId, projectId, workspaceId);
    }

    return prisma.knowledgeSource.findMany({
      where: {
        workspaceId,
        projectId,
      },
      include: {
        documents: {
          include: {
            chunks: {
              take: 1,
              orderBy: { chunkIndex: "asc" },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  }

  async create(userId: string, input: CreateKnowledgeInput) {
    await assertWorkspaceAccess(userId, input.workspaceId, "member");

    if (input.projectId) {
      await this.projects.assertProjectInWorkspace(userId, input.projectId, input.workspaceId);
    }

    const sanitizedText = this.memory.sanitizeExternalContent(input.content);
    const chunks = this.memory.chunkText(sanitizedText);

    return prisma.knowledgeSource.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        type: input.type,
        title: input.title,
        sourceUri: input.sourceUri,
        metadata: {
          ingestionStatus: "indexed",
          chunkCount: chunks.length,
        },
        documents: {
          create: {
            workspaceId: input.workspaceId,
            title: input.title,
            sanitizedText,
            metadata: { sourceType: input.type },
            chunks: {
              create: chunks.map((content, index) => ({
                workspaceId: input.workspaceId,
                chunkIndex: index,
                content,
                tokenCount: Math.ceil(content.length / 4),
              })),
            },
          },
        },
      },
      include: {
        documents: {
          include: {
            chunks: true,
          },
        },
      },
    });
  }
}
