import type { RoutingMode } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";

export type UpdateWorkspaceSettingsInput = {
  defaultRoutingMode?: RoutingMode;
  defaultModelId?: string;
  memoryEnabled?: boolean;
  dataRetentionDays?: number;
};

export class SettingsService {
  async updateWorkspaceSettings(
    userId: string,
    workspaceId: string,
    input: UpdateWorkspaceSettingsInput,
  ) {
    await assertWorkspaceAccess(userId, workspaceId, "admin");

    return prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        defaultRoutingMode: input.defaultRoutingMode,
        defaultModelId: input.defaultModelId,
        memoryEnabled: input.memoryEnabled,
        retentionDays: input.dataRetentionDays,
      },
    });
  }
}
