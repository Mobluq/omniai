import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/errors/api-response";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-context";
import { globalSearchQuerySchema } from "@/lib/validators/api-schemas";
import { SearchService } from "@/modules/search/search-service";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const user = await requireUser();
    await assertRateLimit({
      scope: "workspace.search",
      key: `${user.id}:${getClientIp(request)}`,
      limit: 60,
      windowMs: 60_000,
    });
    const query = globalSearchQuerySchema.parse({
      workspaceId: request.nextUrl.searchParams.get("workspaceId"),
      q: request.nextUrl.searchParams.get("q"),
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });
    const result = await new SearchService().search({
      userId: user.id,
      workspaceId: query.workspaceId,
      query: query.q,
      limit: query.limit,
    });

    return successResponse(result);
  } catch (error: unknown) {
    return handleApiError(error, requestId);
  }
}
