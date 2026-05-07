import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { canManageMarketplace } from "@/modules/identity/role-policy";
import {
  auditSignatureVersion,
  signAuditLog,
  verifyAuditSignature,
  type AuditSignedFilter,
} from "@/modules/marketplace/audit-policy";
import { assertMarketplace } from "@/modules/marketplace/errors";

export type ListAuditLogsInput = {
  adminId: string;
  action?: string;
  entity?: string;
  signed?: AuditSignedFilter;
  take?: number;
};

export type SignAuditBatchInput = {
  adminId: string;
  limit?: number;
};

function auditWhere(input: ListAuditLogsInput): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (input.action) where.action = { contains: input.action, mode: "insensitive" };
  if (input.entity) where.entity = input.entity;
  if (input.signed === "signed") where.signature = { not: null };
  if (input.signed === "unsigned") where.signature = null;
  return where;
}

type PresentableAuditLog = {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  beforeState: unknown;
  afterState: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: unknown;
  signature: string | null;
  createdAt: Date | string;
};

function presentAuditLog<T extends PresentableAuditLog>(log: T) {
  return {
    ...log,
    verified: verifyAuditSignature(log),
    signaturePreview: log.signature ? `${log.signature.slice(0, 12)}...${log.signature.slice(-8)}` : null,
  };
}

export class AuditService {
  private async assertAdmin(adminId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true },
    });

    assertMarketplace(admin, "admin_not_found", "Admin account was not found.", 404);
    assertMarketplace(canManageMarketplace(admin.role), "forbidden", "Admin role is required.", 403);
    return admin;
  }

  async listAuditLogs(input: ListAuditLogsInput) {
    await this.assertAdmin(input.adminId);

    const where = auditWhere(input);
    const take = Math.min(Math.max(input.take ?? 100, 1), 200);
    const [logs, total, signed, unsigned, entities, actions] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { signature: { not: null } } }),
      prisma.auditLog.count({ where: { signature: null } }),
      prisma.auditLog.groupBy({ by: ["entity"], _count: { _all: true }, orderBy: { entity: "asc" } }),
      prisma.auditLog.groupBy({ by: ["action"], _count: { _all: true }, orderBy: { action: "asc" } }),
    ]);

    return {
      logs: logs.map(presentAuditLog),
      stats: {
        total,
        signed,
        unsigned,
        filtered: logs.length,
      },
      facets: {
        entities: entities.map((entity) => ({ entity: entity.entity, count: entity._count._all })),
        actions: actions.map((action) => ({ action: action.action, count: action._count._all })),
      },
    };
  }

  async signUnsignedBatch(input: SignAuditBatchInput) {
    const admin = await this.assertAdmin(input.adminId);
    const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
    const unsignedLogs = await prisma.auditLog.findMany({
      where: { signature: null },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    const signedAt = new Date();
    await prisma.$transaction(async (tx) => {
      for (const log of unsignedLogs) {
        await tx.auditLog.update({
          where: { id: log.id },
          data: {
            signature: signAuditLog(log),
            signatureVersion: auditSignatureVersion,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "audit.batch_signed",
          entity: "AuditLog",
          afterState: {
            signedCount: unsignedLogs.length,
            signatureVersion: auditSignatureVersion,
            signedAt: signedAt.toISOString(),
          },
        },
      });
    });

    return { signedCount: unsignedLogs.length, signatureVersion: auditSignatureVersion };
  }
}
