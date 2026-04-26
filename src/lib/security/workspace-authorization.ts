import { WorkspaceRole } from "@prisma/client";
import { forbidden, notFound } from "@/lib/errors/app-error";
import { prisma } from "@/lib/db/prisma";

const roleRank: Record<WorkspaceRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

export async function assertWorkspaceAccess(
  userId: string,
  workspaceId: string,
  minimumRole: WorkspaceRole = "viewer",
) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  if (!membership) {
    throw notFound("Workspace not found.");
  }

  if (roleRank[membership.role] < roleRank[minimumRole]) {
    throw forbidden();
  }

  return membership;
}
