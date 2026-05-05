import type { AIAccountMode, RoutingMode } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";

export type CompleteOnboardingInput = {
  workspaceId: string;
  aiAccountMode: AIAccountMode;
  defaultRoutingMode: RoutingMode;
  memoryEnabled: boolean;
};

export class OnboardingService {
  async complete(userId: string, input: CompleteOnboardingInput) {
    await assertWorkspaceAccess(userId, input.workspaceId, "admin");

    const workspace = await prisma.workspace.update({
      where: { id: input.workspaceId },
      data: {
        aiAccountMode: input.aiAccountMode,
        defaultRoutingMode: input.defaultRoutingMode,
        memoryEnabled: input.memoryEnabled,
        onboardingCompletedAt: new Date(),
        auditLogs: {
          create: {
            userId,
            action: "workspace.onboarding.complete",
            entityType: "workspace",
            metadata: {
              aiAccountMode: input.aiAccountMode,
              defaultRoutingMode: input.defaultRoutingMode,
              memoryEnabled: input.memoryEnabled,
            },
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId,
        workspaceId: input.workspaceId,
        type: "system",
        title: "AI access preference saved",
        body: accessModeNotificationBody(input.aiAccountMode),
        actionUrl: "/settings",
        metadata: {
          aiAccountMode: input.aiAccountMode,
        },
      },
    });

    return workspace;
  }
}

function accessModeNotificationBody(mode: AIAccountMode) {
  if (mode === "byok") {
    return "This workspace will use provider keys you connect in settings.";
  }

  if (mode === "hybrid") {
    return "This workspace can use OmniAI managed credits first and connected provider keys when needed.";
  }

  return "This workspace will use OmniAI managed credits for model access.";
}
