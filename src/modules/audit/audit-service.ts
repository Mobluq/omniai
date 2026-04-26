import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type AuditInput = {
  userId?: string;
  workspaceId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonValue;
};

export class AuditService {
  async record(input: AuditInput) {
    return prisma.auditLog.create({
      data: {
        userId: input.userId,
        workspaceId: input.workspaceId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: input.metadata,
      },
    });
  }
}
