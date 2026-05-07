import type { PhotoRole } from "@prisma/client";

export const ALLOWED_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_LISTING_IMAGE_BYTES = 15 * 1024 * 1024;

export function isAllowedImageContentType(value: string) {
  return ALLOWED_IMAGE_CONTENT_TYPES.includes(value as (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number]);
}

export function imageExtensionForContentType(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export function qualityScoreFromImageMetadata(input: {
  width?: number;
  height?: number;
  byteSize?: number;
  role?: PhotoRole;
}) {
  let score = 100;

  if (!input.width || !input.height) score -= 20;
  if (input.width && input.width < 900) score -= 20;
  if (input.height && input.height < 900) score -= 20;
  if (input.byteSize && input.byteSize < 80_000) score -= 10;
  if (input.role === "label" && input.width && input.width < 1200) score -= 10;

  return Math.max(0, Math.min(100, score));
}
