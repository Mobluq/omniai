import type { Prisma, RequestType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { forbidden } from "@/lib/errors/app-error";

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

export const usageRequestTypes = [
  "text_generation",
  "image_generation",
  "embedding",
  "routing",
  "recommendation",
] as const satisfies readonly RequestType[];

export const usageStatusFilters = ["success", "failed"] as const;

export type UsageStatusFilter = (typeof usageStatusFilters)[number];

export type UsageSummaryOptions = {
  days?: number;
  provider?: string;
  modelId?: string;
  requestType?: RequestType;
  status?: UsageStatusFilter;
};

export function parseUsageRequestType(value?: string | null): RequestType | undefined {
  return usageRequestTypes.includes(value as RequestType) ? (value as RequestType) : undefined;
}

export function parseUsageStatus(value?: string | null): UsageStatusFilter | undefined {
  return usageStatusFilters.includes(value as UsageStatusFilter)
    ? (value as UsageStatusFilter)
    : undefined;
}

export class UsageService {
  async assertWorkspaceWithinLimits(workspaceId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        workspaceId,
        status: { in: ["trialing", "active"] },
      },
      include: {
        plan: {
          include: { usageLimits: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const plan =
      subscription?.plan ??
      (await prisma.plan.findUnique({
        where: { code: "free" },
        include: { usageLimits: true },
      }));
    const messageLimit = plan?.usageLimits.find(
      (limit) => limit.metric === "messages" && limit.period === "month",
    );

    if (!messageLimit) {
      return;
    }

    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const used = await prisma.usageLog.count({
      where: {
        workspaceId,
        success: true,
        createdAt: { gte: periodStart },
      },
    });

    if (used >= messageLimit.limit) {
      throw forbidden(
        `This workspace has reached its ${plan?.name ?? "current"} plan usage limit for the month.`,
      );
    }
  }

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

  async summarize(workspaceId: string, input: number | UsageSummaryOptions = 30) {
    const options = typeof input === "number" ? { days: input } : input;
    const days = clampUsageDays(options.days ?? 30);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const where: Prisma.UsageLogWhereInput = {
      workspaceId,
      createdAt: { gte: since },
      ...(options.provider ? { provider: options.provider } : {}),
      ...(options.modelId ? { modelId: options.modelId } : {}),
      ...(options.requestType ? { requestType: options.requestType } : {}),
      ...(options.status === "success" ? { success: true } : {}),
      ...(options.status === "failed" ? { success: false } : {}),
    };
    const logs = await prisma.usageLog.findMany({
      where,
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
      daily: fillDailyRollups(daily, days),
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

function clampUsageDays(value: number) {
  return Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), 1), 365) : 30;
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

function fillDailyRollups(map: Map<string, UsageRollup & { date: string }>, days: number) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);

    return map.get(key) ?? emptyRollup(key, { date: key });
  });
}
