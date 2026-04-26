import type { WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 56);
}

export class WorkspaceService {
  async listForUser(userId: string) {
    return prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(userId: string, name: string) {
    const slug = `${slugify(name)}-${crypto.randomUUID().slice(0, 8)}`;

    return prisma.workspace.create({
      data: {
        name,
        slug,
        type: "team",
        members: {
          create: {
            userId,
            role: "owner",
          },
        },
        auditLogs: {
          create: {
            userId,
            action: "workspace.create",
            entityType: "workspace",
          },
        },
      },
    });
  }

  async getForUser(userId: string, workspaceId: string, role: WorkspaceRole = "viewer") {
    await assertWorkspaceAccess(userId, workspaceId, role);

    return prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });
  }

  async ensurePersonalWorkspace(userId: string, userName: string | null) {
    const existing = await prisma.workspace.findFirst({
      where: {
        type: "personal",
        members: {
          some: { userId, role: "owner" },
        },
      },
    });

    if (existing) {
      return existing;
    }

    const name = userName ? `${userName}'s Workspace` : "Personal Workspace";
    return this.create(userId, name);
  }
}
