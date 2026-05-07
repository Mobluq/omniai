export const evidenceCategories = [
  "item_condition",
  "authentication",
  "delivery",
  "payment",
  "conversation",
  "other",
] as const;

export type EvidenceCategory = (typeof evidenceCategories)[number];

export const EVIDENCE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type EvidenceContentType = (typeof EVIDENCE_CONTENT_TYPES)[number];

export const MAX_EVIDENCE_FILE_BYTES = 20 * 1024 * 1024;
export const evidenceRecordVersion = "2026-05-07";

export type EvidenceFileRecord = {
  id: string;
  assetId: string;
  url: string;
  category: EvidenceCategory;
  contentType: EvidenceContentType;
  byteSize: number | null;
  checksumSha256: string | null;
  uploadedById: string;
  note: string | null;
  redacted: boolean;
  attachedAt: string;
};

export type EvidenceRecord = {
  version: typeof evidenceRecordVersion;
  files: EvidenceFileRecord[];
  countsByCategory: Partial<Record<EvidenceCategory, number>>;
  lastAttachedAt: string | null;
  lastAttachedById: string | null;
  legacy?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isEvidenceCategory(value: string): value is EvidenceCategory {
  return evidenceCategories.includes(value as EvidenceCategory);
}

export function isAllowedEvidenceContentType(value: string): value is EvidenceContentType {
  return EVIDENCE_CONTENT_TYPES.includes(value as EvidenceContentType);
}

export function evidenceExtensionForContentType(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "application/pdf") return "pdf";
  return "jpg";
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function safeByteSize(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function toEvidenceFileRecord(value: unknown): EvidenceFileRecord | null {
  if (!isRecord(value)) return null;

  const assetId = safeString(value.assetId);
  const id = safeString(value.id) ?? assetId;
  const url = safeString(value.url);
  const category = safeString(value.category);
  const contentType = safeString(value.contentType);
  const uploadedById = safeString(value.uploadedById);
  const attachedAt = safeString(value.attachedAt);

  if (
    !assetId ||
    !id ||
    !url ||
    !category ||
    !isEvidenceCategory(category) ||
    !contentType ||
    !isAllowedEvidenceContentType(contentType) ||
    !uploadedById ||
    !attachedAt
  ) {
    return null;
  }

  return {
    id,
    assetId,
    url,
    category,
    contentType,
    byteSize: safeByteSize(value.byteSize),
    checksumSha256: safeString(value.checksumSha256),
    uploadedById,
    note: safeString(value.note),
    redacted: value.redacted === true,
    attachedAt,
  };
}

function countsFor(files: EvidenceFileRecord[]) {
  return files.reduce<Partial<Record<EvidenceCategory, number>>>((counts, file) => {
    counts[file.category] = (counts[file.category] ?? 0) + 1;
    return counts;
  }, {});
}

export function normalizeEvidenceRecord(value: unknown): EvidenceRecord {
  const record = isRecord(value) ? value : {};
  const files = Array.isArray(record.files)
    ? record.files
        .map(toEvidenceFileRecord)
        .filter((file): file is EvidenceFileRecord => Boolean(file))
    : [];

  return {
    version: evidenceRecordVersion,
    files,
    countsByCategory: countsFor(files),
    lastAttachedAt: safeString(record.lastAttachedAt),
    lastAttachedById: safeString(record.lastAttachedById),
    legacy:
      isRecord(value) && !Array.isArray(record.files) && Object.keys(record).length > 0
        ? record
        : undefined,
  };
}

export function mergeEvidenceFile(
  record: EvidenceRecord,
  file: EvidenceFileRecord,
): EvidenceRecord {
  const files = [
    ...record.files.filter((existing) => existing.assetId !== file.assetId),
    file,
  ].sort((left, right) => left.attachedAt.localeCompare(right.attachedAt));

  return {
    version: evidenceRecordVersion,
    files,
    countsByCategory: countsFor(files),
    lastAttachedAt: file.attachedAt,
    lastAttachedById: file.uploadedById,
    legacy: record.legacy,
  };
}

export function evidenceFileState(record: EvidenceRecord) {
  return {
    totalFiles: record.files.length,
    hasDeliveryEvidence: record.files.some((file) => file.category === "delivery"),
    hasAuthenticationEvidence: record.files.some((file) => file.category === "authentication"),
    countsByCategory: record.countsByCategory,
  };
}
