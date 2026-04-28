import { createHash, randomBytes } from "node:crypto";
import type { WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { badRequest, forbidden, notFound } from "@/lib/errors/app-error";
import { isTransactionalEmailConfigured, sendWorkspaceInviteEmail } from "@/lib/email/email-service";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";

type InviteRole = Exclude<WorkspaceRole, "owner">;

function getAppUrl() {
  return process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function publicInvite(invite: {
  id: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
    acceptedAt: invite.acceptedAt,
    revokedAt: invite.revokedAt,
    createdAt: invite.createdAt,
  };
}

export class WorkspaceTeamService {
  async list(userId: string, workspaceId: string) {
    await assertWorkspaceAccess(userId, workspaceId);

    const [workspace, currentMembership, invites] = await Promise.all([
      prisma.workspace.findUniqueOrThrow({
        where: { id: workspaceId },
        select: {
          id: true,
          name: true,
          members: {
            orderBy: [{ role: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              role: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      }),
      prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
        select: { role: true },
      }),
      prisma.workspaceInvite.findMany({
        where: {
          workspaceId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          acceptedAt: true,
          revokedAt: true,
          createdAt: true,
        },
      }),
    ]);

    const canManage = currentMembership?.role === "owner" || currentMembership?.role === "admin";

    return {
      workspace: { id: workspace.id, name: workspace.name },
      currentRole: currentMembership?.role ?? "viewer",
      members: workspace.members,
      invites: canManage ? invites.map(publicInvite) : [],
      canManage,
    };
  }

  async createInvite(input: {
    userId: string;
    workspaceId: string;
    email: string;
    role: InviteRole;
  }) {
    await assertWorkspaceAccess(input.userId, input.workspaceId, "admin");
    const email = input.email.toLowerCase().trim();
    const [workspace, inviter, existingUser] = await Promise.all([
      prisma.workspace.findUniqueOrThrow({
        where: { id: input.workspaceId },
        select: { id: true, name: true },
      }),
      prisma.user.findUnique({
        where: { id: input.userId },
        select: { name: true, email: true },
      }),
      prisma.user.findUnique({
        where: { email },
        select: { id: true },
      }),
    ]);

    if (existingUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: existingUser.id, workspaceId: input.workspaceId } },
      });

      if (existingMember) {
        throw badRequest("This user is already a member of the workspace.");
      }
    }

    await prisma.workspaceInvite.updateMany({
      where: {
        workspaceId: input.workspaceId,
        email,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    const token = randomBytes(32).toString("base64url");
    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId: input.workspaceId,
        email,
        role: input.role,
        tokenHash: hashInviteToken(token),
        invitedById: input.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
    const inviteUrl = `${getAppUrl().replace(/\/$/, "")}/invite?token=${encodeURIComponent(token)}`;
    const emailDelivery = await sendWorkspaceInviteEmail({
      to: email,
      workspaceName: workspace.name,
      inviterName: inviter?.name ?? inviter?.email ?? "A workspace admin",
      inviteUrl,
    });

    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        workspaceId: input.workspaceId,
        action: "workspace.invite_created",
        entityType: "workspaceInvite",
        entityId: invite.id,
        metadata: { email, role: input.role, emailSent: emailDelivery.sent },
      },
    });

    return {
      invite: publicInvite(invite),
      inviteUrl,
      emailConfigured: isTransactionalEmailConfigured(),
      emailSent: emailDelivery.sent,
    };
  }

  async revokeInvite(userId: string, workspaceId: string, inviteId: string) {
    await assertWorkspaceAccess(userId, workspaceId, "admin");
    const invite = await prisma.workspaceInvite.findFirst({
      where: { id: inviteId, workspaceId },
    });

    if (!invite) {
      throw notFound("Invite not found.");
    }

    await prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { revokedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        workspaceId,
        action: "workspace.invite_revoked",
        entityType: "workspaceInvite",
        entityId: invite.id,
      },
    });

    return { revoked: true };
  }

  async updateMemberRole(userId: string, workspaceId: string, memberId: string, role: InviteRole) {
    await assertWorkspaceAccess(userId, workspaceId, "admin");
    const member = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });

    if (!member) {
      throw notFound("Member not found.");
    }

    if (member.role === "owner") {
      throw forbidden("Workspace owners cannot be changed from this screen.");
    }

    if (member.userId === userId) {
      throw badRequest("You cannot change your own workspace role.");
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: member.id },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        workspaceId,
        action: "workspace.member_role_updated",
        entityType: "workspaceMember",
        entityId: member.id,
        metadata: { role },
      },
    });

    return { member: updated };
  }

  async removeMember(userId: string, workspaceId: string, memberId: string) {
    await assertWorkspaceAccess(userId, workspaceId, "admin");
    const member = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });

    if (!member) {
      throw notFound("Member not found.");
    }

    if (member.role === "owner") {
      throw forbidden("Workspace owners cannot be removed from this screen.");
    }

    if (member.userId === userId) {
      throw badRequest("You cannot remove yourself from the workspace from this screen.");
    }

    await prisma.workspaceMember.delete({ where: { id: member.id } });
    await prisma.auditLog.create({
      data: {
        userId,
        workspaceId,
        action: "workspace.member_removed",
        entityType: "workspaceMember",
        entityId: member.id,
      },
    });

    return { removed: true };
  }

  async acceptInvite(userId: string, token: string) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user.email) {
      throw badRequest("Your account needs an email address before accepting workspace invites.");
    }

    const invite = await prisma.workspaceInvite.findUnique({
      where: { tokenHash: hashInviteToken(token) },
      include: {
        workspace: { select: { id: true, name: true } },
      },
    });

    if (!invite || invite.revokedAt || invite.acceptedAt || invite.expiresAt <= new Date()) {
      throw badRequest("This invite is invalid or expired.");
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw forbidden("This invite was sent to a different email address.");
    }

    await prisma.$transaction([
      prisma.workspaceMember.upsert({
        where: { userId_workspaceId: { userId, workspaceId: invite.workspaceId } },
        update: { role: invite.role },
        create: {
          userId,
          workspaceId: invite.workspaceId,
          role: invite.role,
        },
      }),
      prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: {
          acceptedAt: new Date(),
          acceptedById: userId,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          workspaceId: invite.workspaceId,
          action: "workspace.invite_accepted",
          entityType: "workspaceInvite",
          entityId: invite.id,
        },
      }),
      prisma.notification.create({
        data: {
          userId,
          workspaceId: invite.workspaceId,
          type: "workspace",
          title: "Workspace joined",
          body: `You joined ${invite.workspace.name}.`,
          actionUrl: "/dashboard",
        },
      }),
    ]);

    return {
      workspace: invite.workspace,
      role: invite.role,
    };
  }
}
