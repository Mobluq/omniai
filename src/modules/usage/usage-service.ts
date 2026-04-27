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

  async summarize(workspaceId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const logs = await prisma.usageLog.findMany({
      where: { workspaceId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const byProvider = new Map<string, UsageRollup>();
    const byModel = new Map<string, UsageRollup & { modelId: string; provider: string }>();
    const byRequestType = new Map<string, UsageRollup & { requestType: RequestType }>();
    const daily = new Map<string, UsageRollup & { date: string }>();

    for (const log of logs) {
      const costEstimate = Number(log.costEstimate);
      addRollup(byProvider, log.provider, log, costEstimate);
      addRollup(byModel, `${log.provider}:${log.modelId}`, log, costEstimate, {
        provider: log.provider,
        modelId: log.modelId,
      });
      addRollup(byRequestType, log.requestType, log, costEstimate, {
        requestType: log.requestType,
      });
      addRollup(daily, log.createdAt.toISOString().slice(0, 10), log, costEstimate, {
        date: log.createdAt.toISOString().slice(0, 10),
      });
    }

    return {
      windowDays: days,
      requestCount: logs.length,
      successCount: logs.filter((log) => log.success).length,
      failureCount: logs.filter((log) => !log.success).length,
      tokenInputEstimate: logs.reduce((sum, log) => sum + log.tokenInputEstimate, 0),
      tokenOutputEstimate: logs.reduce((sum, log) => sum + log.tokenOutputEstimate, 0),
      costEstimate: logs.reduce((sum, log) => sum + Number(log.costEstimate), 0),
      byProvider: sortRollups(byProvider),
      byModel: sortRollups(byModel),
      byRequestType: sortRollups(byRequestType),
      daily: Array.from(daily.values()).sort((left, right) => left.date.localeCompare(right.date)),
      recent: logs.slice(0, 20).map((log) => ({
        id: log.id,
        provider: log.provider,
        modelId: log.modelId,
        requestType: log.requestType,
        tokenInputEstimate: log.tokenInputEstimate,
        tokenOutputEstimate: log.tokenOutputEstimate,
        costEstimate: Number(log.costEstimate),
        success: log.success,
        errorCode: log.errorCode,
        createdAt: log.createdAt,
      })),
    };
  }
}

type UsageRollup = {
  key: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  tokenInputEstimate: number;
  tokenOutputEstimate: number;
  costEstimate: number;
};

function emptyRollup<TExtra extends object>(key: string, extra?: TExtra): UsageRollup & TExtra {
  return {
    key,
    requestCount: 0,
    successCount: 0,
    failureCount: 0,
    tokenInputEstimate: 0,
    tokenOutputEstimate: 0,
    costEstimate: 0,
    ...(extra ?? ({} as TExtra)),
  };
}

function addRollup<TExtra extends object>(
  map: Map<string, UsageRollup & TExtra>,
  key: string,
  log: {
    success: boolean;
    tokenInputEstimate: number;
    tokenOutputEstimate: number;
  },
  costEstimate: number,
  extra?: TExtra,
) {
  const current = map.get(key) ?? emptyRollup(key, extra);
  current.requestCount += 1;
  current.successCount += log.success ? 1 : 0;
  current.failureCount += log.success ? 0 : 1;
  current.tokenInputEstimate += log.tokenInputEstimate;
  current.tokenOutputEstimate += log.tokenOutputEstimate;
  current.costEstimate += costEstimate;
  map.set(key, current);
}

function sortRollups<T extends UsageRollup>(map: Map<string, T>) {
  return Array.from(map.values()).sort((left, right) => right.requestCount - left.requestCount);
}
