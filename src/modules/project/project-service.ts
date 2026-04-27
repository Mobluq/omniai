import type { Prisma, ProjectStatus, RoutingMode } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { badRequest, notFound } from "@/lib/errors/app-error";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";

export type CreateProjectInput = {
  workspaceId: string;
  name: string;
  description?: string;
  instructions?: string;
  defaultRoutingMode: RoutingMode;
  defaultProvider?: string;
  defaultModelId?: string;
};

export type UpdateProjectInput = {
  name?: string;
  description?: string;
  instructions?: string;
  defaultRoutingMode?: RoutingMode;
  defaultProvider?: string | null;
  defaultModelId?: string | null;
  status?: ProjectStatus;
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 56);
}

async function createUniqueSlug(workspaceId: string, name: string) {
  const base = slugify(name) || "project";
  let slug = base;
  let suffix = 1;

  while (
    await prisma.project.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
      select: { id: true },
    })
  ) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export class ProjectService {
  async list(userId: string, workspaceId: string) {
    await assertWorkspaceAccess(userId, workspaceId);

    return prisma.project.findMany({
      where: {
        workspaceId,
        status: "active",
      },
      include: {
        _count: {
          select: {
            conversations: true,
            knowledgeSources: true,
            artifacts: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async create(userId: string, input: CreateProjectInput) {
    await assertWorkspaceAccess(userId, input.workspaceId, "member");
    const slug = await createUniqueSlug(input.workspaceId, input.name);

    return prisma.project.create({
      data: {
        workspaceId: input.workspaceId,
        createdById: userId,
        name: input.name,
        slug,
        description: input.description,
        instructions: input.instructions,
        defaultRoutingMode: input.defaultRoutingMode,
        defaultProvider: input.defaultProvider,
        defaultModelId: input.defaultModelId,
      },
    });
  }

  async get(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          members: {
            some: { userId },
          },
        },
      },
      include: {
        conversations: {
          where: { archivedAt: null },
          orderBy: { updatedAt: "desc" },
          take: 20,
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
        knowledgeSources: {
          orderBy: { updatedAt: "desc" },
          take: 20,
          include: { documents: { take: 1 } },
        },
        artifacts: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!project) {
      throw notFound("Project not found.");
    }

    return project;
  }

  async assertProjectInWorkspace(userId: string, projectId: string, workspaceId: string) {
    const project = await this.get(userId, projectId);

    if (project.workspaceId !== workspaceId) {
      throw badRequest("Project does not belong to this workspace.");
    }

    return project;
  }

  async update(userId: string, projectId: string, input: UpdateProjectInput) {
    const project = await this.get(userId, projectId);
    await assertWorkspaceAccess(userId, project.workspaceId, "member");

    const data: Prisma.ProjectUpdateInput = {
      name: input.name,
      description: input.description,
      instructions: input.instructions,
      defaultRoutingMode: input.defaultRoutingMode,
      defaultProvider: input.defaultProvider,
      defaultModelId: input.defaultModelId,
      status: input.status,
    };

    if (input.name && input.name !== project.name) {
      data.slug = await createUniqueSlug(project.workspaceId, input.name);
    }

    return prisma.project.update({
      where: { id: projectId },
      data,
    });
  }

  async archive(userId: string, projectId: string) {
    return this.update(userId, projectId, { status: "archived" });
  }
}
