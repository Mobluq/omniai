import { createHash, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

export function getRequestId(request: NextRequest) {
  return request.headers.get("x-request-id") ?? randomUUID();
}

export function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function getUserAgent(request: NextRequest) {
  return request.headers.get("user-agent") ?? "unknown";
}

export function hashSensitiveText(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function sanitizeUserText(input: string) {
  return input.replace(/\u0000/g, "").trim();
}
