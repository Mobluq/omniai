import { successResponse } from "@/lib/errors/api-response";

export async function GET() {
  return successResponse({
    status: "ok",
    service: "omniai",
    timestamp: new Date().toISOString(),
  });
}
