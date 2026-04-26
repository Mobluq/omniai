import type { RequestType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type RecordUsageInput = {
  userId: string;
  workspaceId: string;
  conversationId?: string;
  provider: string;
  modelId: string;
  requestType: RequestType;
  tokenInputEstimate?: number;
  tokenOutputEstimate?: number;
  costEstimate?: number;
  success: boolean;
  errorCode?: string;
};

export class UsageService {
  async record(input: RecordUsageInput) {
    return prisma.usageLog.create({
      data: {
        userId: input.userId,
        workspaceId: input.workspaceId,
        conversationId: input.conversationId,
        provider: input.provider,
        modelId: input.modelId,
        requestType: input.requestType,
        tokenInputEstimate: input.tokenInputEstimate ?? 0,
        tokenOutputEstimate: input.tokenOutputEstimate ?? 0,
        costEstimate: input.costEstimate ?? 0,
        success: input.success,
        errorCode: input.errorCode,
      },
    });
  }

  async summarize(workspaceId: string) {
    const logs = await prisma.usageLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return {
      requestCount: logs.length,
      tokenInputEstimate: logs.reduce((sum, log) => sum + log.tokenInputEstimate, 0),
      tokenOutputEstimate: logs.reduce((sum, log) => sum + log.tokenOutputEstimate, 0),
      costEstimate: logs.reduce((sum, log) => sum + Number(log.costEstimate), 0),
      byProvider: logs.reduce<Record<string, number>>((summary, log) => {
        summary[log.provider] = (summary[log.provider] ?? 0) + 1;
        return summary;
      }, {}),
    };
  }
}
