import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type AuditEventInput = {
  actorId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  beforeState?: Prisma.InputJsonObject;
  afterState?: Prisma.InputJsonObject;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Prisma.InputJsonObject;
};

export class AuditService {
  async record(input: AuditEventInput) {
    return prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entity: input.entity ?? "System",
        entityId: input.entityId,
        beforeState: input.beforeState,
        afterState: input.afterState,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        requestId: input.requestId,
        metadata: input.metadata,
      },
    });
  }
}
