import { ok } from "@/lib/errors/api-response";

export function GET() {
  return ok({
    status: "ok",
    service: "bd-select",
    timestamp: new Date().toISOString(),
  });
}
