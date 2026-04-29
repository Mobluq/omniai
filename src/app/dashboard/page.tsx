import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { OmniTemplateDashboard } from "@/components/dashboard/omnia-template-dashboard";
import { UsageService } from "@/modules/usage/usage-service";
import { WorkspaceService } from "@/modules/workspace/workspace-service";
import { ConversationService } from "@/modules/conversation/conversation-service";
import { ProviderConfigurationService } from "@/modules/ai/providers/provider-config-service";
import { KnowledgeService } from "@/modules/knowledge/knowledge-service";
import { ArtifactService } from "@/modules/artifact/artifact-service";

export default async function DashboardPage() {
  const user = await requireUser();
  const workspaces = await new WorkspaceService().listForUser(user.id);
  const workspace = workspaces[0];
  const conversations = workspace
    ? await new ConversationService().list(user.id, workspace.id)
    : [];
  const usage = workspace
    ? await new UsageService().summarize(workspace.id)
    : {
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        costEstimate: 0,
        byProvider: [],
        byRequestType: [],
      };
  const routingDecisionCount = workspace
    ? await prisma.recommendationLog.count({ where: { workspaceId: workspace.id } })
    : 0;
  const recentRecommendations = workspace
    ? await prisma.recommendationLog.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          detectedIntent: true,
          recommendedProvider: true,
          recommendedModelId: true,
          confidence: true,
          reason: true,
          routingMode: true,
          accepted: true,
          createdAt: true,
        },
      })
    : [];
  const providers = workspace
    ? await new ProviderConfigurationService().listWorkspaceConnections(user.id, workspace.id)
    : [];
  const knowledgeSources = workspace
    ? await new KnowledgeService().list(user.id, workspace.id)
    : [];
  const artifacts = workspace ? await new ArtifactService().list(user.id, workspace.id) : [];

  return (
    <AppShell>
      <OmniTemplateDashboard
        workspaceName={workspace?.name ?? "OmniAI Workspace"}
        conversationsCount={conversations.length}
        requestCount={usage.requestCount}
        successCount={usage.successCount}
        failureCount={usage.failureCount}
        routingDecisionCount={routingDecisionCount}
        estimatedCost={usage.costEstimate}
        knowledgeSourceCount={knowledgeSources.length}
        artifactCount={artifacts.length}
        providers={providers}
        usageByProvider={usage.byProvider.slice(0, 6)}
        usageByTask={usage.byRequestType.slice(0, 6)}
        recentConversations={conversations.slice(0, 5).map((conversation) => ({
          id: conversation.id,
          title: conversation.title,
          routingMode: conversation.routingMode,
          activeProvider: conversation.activeProvider,
          activeModelId: conversation.activeModelId,
          updatedAt: conversation.updatedAt.toISOString(),
          lastMessage: conversation.messages[0]?.content ?? null,
        }))}
        recentRecommendations={recentRecommendations.map((recommendation) => ({
          id: recommendation.id,
          detectedIntent: recommendation.detectedIntent,
          recommendedProvider: recommendation.recommendedProvider,
          recommendedModelId: recommendation.recommendedModelId,
          confidence: Number(recommendation.confidence),
          reason: recommendation.reason,
          routingMode: recommendation.routingMode,
          accepted: recommendation.accepted,
          createdAt: recommendation.createdAt.toISOString(),
        }))}
      />
    </AppShell>
  );
}
