import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { badRequest } from "@/lib/errors/app-error";
import { assertWorkspaceAccess } from "@/lib/security/workspace-authorization";
import {
  parseUsageRequestType,
  parseUsageStatus,
  UsageService,
} from "@/modules/usage/usage-service";

function cleanUsageParam(value: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "all" ? trimmed.slice(0, 140) : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");

    if (!workspaceId) {
      throw badRequest("workspaceId is required.");
    }

    const searchParams = request.nextUrl.searchParams;
    const rawDays = Number(searchParams.get("days") ?? "30");
    const days = Number.isFinite(rawDays) ? Math.min(Math.max(Math.trunc(rawDays), 1), 365) : 30;
    const rawRequestType = searchParams.get("requestType");
    const rawStatus = searchParams.get("status");
    const requestType = parseUsageRequestType(rawRequestType);
    const status = parseUsageStatus(rawStatus);

    if (rawRequestType && rawRequestType !== "all" && !requestType) {
      throw badRequest("requestType is invalid.");
    }

    if (rawStatus && rawStatus !== "all" && !status) {
      throw badRequest("status is invalid.");
    }

    await assertWorkspaceAccess(user.id, workspaceId);
    const summary = await new UsageService().summarize(workspaceId, {
      days,
      provider: cleanUsageParam(searchParams.get("provider")),
      modelId: cleanUsageParam(searchParams.get("model")),
      requestType,
      status,
    });
    return successResponse({ summary });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
