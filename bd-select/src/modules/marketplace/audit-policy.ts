import { sha256 } from "@/lib/security/encryption";

export const auditSignatureVersion = "bd-select-audit-v1";
export const auditSignedFilters = ["all", "signed", "unsigned"] as const;

export type AuditSignedFilter = (typeof auditSignedFilters)[number];

type JsonLike = null | boolean | number | string | JsonLike[] | { [key: string]: JsonLike };

function canonicalize(value: unknown): JsonLike {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }

  if (["string", "number", "boolean"].includes(typeof value)) {
    return value as JsonLike;
  }

  return null;
}

export function isAuditSignedFilter(value: string | null): value is AuditSignedFilter {
  return auditSignedFilters.some((filter) => filter === value);
}

export function auditSignaturePayload(log: {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  beforeState: unknown;
  afterState: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: unknown;
  createdAt: Date | string;
}) {
  return JSON.stringify(
    canonicalize({
      id: log.id,
      actorId: log.actorId,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      beforeState: log.beforeState,
      afterState: log.afterState,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      requestId: log.requestId,
      metadata: log.metadata,
      createdAt: log.createdAt,
    }),
  );
}

export function signAuditLog(
  log: Parameters<typeof auditSignaturePayload>[0],
  secret = process.env.AUDIT_SIGNING_SECRET || process.env.APP_ENCRYPTION_KEY || "local-audit-signing-key",
) {
  return sha256(`${auditSignatureVersion}:${secret}:${auditSignaturePayload(log)}`);
}

export function verifyAuditSignature(log: Parameters<typeof auditSignaturePayload>[0] & { signature: string | null }) {
  return Boolean(log.signature) && signAuditLog(log) === log.signature;
}
