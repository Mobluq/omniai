import type { RoutingMode } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sanitizeUserText, hashSensitiveText } from "@/lib/security/request-context";
import { ConversationService } from "@/modules/conversation/conversation-service";
import { MemoryService } from "@/modules/memory/memory-service";
import { RecommendationEngine } from "@/modules/ai/recommendation/recommendation-engine";
import { RoutingEngine } from "@/modules/ai/routing/routing-engine";
import { UsageService } from "@/modules/usage/usage-service";

export type SendConversationMessageInput = {
  content: string;
  routingMode: RoutingMode;
  selectedProvider?: string;
  selectedModelId?: string;
  acceptRecommendation?: boolean;
};

export class ChatOrchestrator {
  private readonly conversations = new ConversationService();
  private readonly memory = new MemoryService();
  private readonly recommendations = new RecommendationEngine();
  private readonly routing = new RoutingEngine();
  private readonly usage = new UsageService();

  async sendMessage(userId: string, conversationId: string, input: SendConversationMessageInput) {
    const conversation = await this.conversations.get(userId, conversationId);
    const content = sanitizeUserText(input.content);

    const userMessage = await this.conversations.addMessage({
      conversationId: conversation.id,
      workspaceId: conversation.workspaceId,
      userId,
      role: "user",
      content,
    });

    const recommendation = this.recommendations.evaluate({
      prompt: content,
      currentProvider: conversation.activeProvider ?? input.selectedProvider,
      currentModelId: conversation.activeModelId ?? input.selectedModelId,
    });

    await prisma.recommendationLog.create({
      data: {
        userId,
        workspaceId: conversation.workspaceId,
        promptHash: hashSensitiveText(content),
        detectedIntent: recommendation.detectedIntent,
        currentProvider: conversation.activeProvider,
        currentModelId: conversation.activeModelId,
        recommendedProvider: recommendation.recommendedProvider,
        recommendedModelId: recommendation.recommendedModel,
        confidence: recommendation.confidence,
        reason: recommendation.reason,
        accepted: input.acceptRecommendation,
        routingMode: input.routingMode,
      },
    });

    const shouldPauseForSuggestion =
      input.routingMode === "suggest" &&
      recommendation.shouldAskToSwitch &&
      input.acceptRecommendation === undefined;

    if (shouldPauseForSuggestion) {
      return {
        userMessage,
        assistantMessage: null,
        recommendation,
        routingDecision: null,
      };
    }

    const context = this.memory.prepareContextInjection(await this.memory.retrieveRelevantContext());
    const routed = await this.routing.route({
      prompt: content,
      routingMode: input.routingMode,
      selectedProvider: input.selectedProvider,
      selectedModelId: input.selectedModelId,
      currentProvider: conversation.activeProvider ?? input.selectedProvider,
      currentModelId: conversation.activeModelId ?? input.selectedModelId,
      acceptRecommendation: input.acceptRecommendation,
      context,
    });

    const assistantMessage = await this.conversations.addMessage({
      conversationId: conversation.id,
      workspaceId: conversation.workspaceId,
      role: "assistant",
      content: routed.output.content,
      provider: routed.decision.provider,
      modelId: routed.decision.modelId,
      modelDisplayName: routed.decision.modelDisplayName,
      tokenInput: routed.output.tokenInputEstimate,
      tokenOutput: routed.output.tokenOutputEstimate,
      metadata: {
        routingMode: routed.decision.mode,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        activeProvider: routed.decision.provider,
        activeModelId: routed.decision.modelId,
        routingMode: routed.decision.mode,
      },
    });

    await this.usage.record({
      userId,
      workspaceId: conversation.workspaceId,
      conversationId: conversation.id,
      provider: routed.decision.provider,
      modelId: routed.decision.modelId,
      requestType: "text_generation",
      tokenInputEstimate: routed.output.tokenInputEstimate,
      tokenOutputEstimate: routed.output.tokenOutputEstimate,
      success: true,
    });

    return {
      userMessage,
      assistantMessage,
      recommendation,
      routingDecision: routed.decision,
    };
  }
}
