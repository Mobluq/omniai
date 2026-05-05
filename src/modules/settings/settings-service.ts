import type { AIAccountMode, RoutingMode } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";

export type UpdateWorkspaceSettingsInput = {
  aiAccountMode?: AIAccountMode;
  onboardingCompleted?: boolean;
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
        aiAccountMode: input.aiAccountMode,
        onboardingCompletedAt: input.onboardingCompleted ? new Date() : undefined,
        defaultRoutingMode: input.defaultRoutingMode,
        defaultModelId: input.defaultModelId,
        memoryEnabled: input.memoryEnabled,
        retentionDays: input.dataRetentionDays,
      },
    });
  }
}
