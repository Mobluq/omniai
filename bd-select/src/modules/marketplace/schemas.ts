import { z } from "zod";
import { auditSignedFilters } from "@/modules/marketplace/audit-policy";
import { disputeResolutionDecisions } from "@/modules/marketplace/dispute-policy";
import {
  EVIDENCE_CONTENT_TYPES,
  evidenceCategories,
  MAX_EVIDENCE_FILE_BYTES,
} from "@/modules/marketplace/evidence-policy";
import { proTiers, promotionTypes } from "@/modules/marketplace/growth-policy";
import { payoutTransitionActions } from "@/modules/marketplace/payout-policy";
import { reportingRanges } from "@/modules/marketplace/insights-policy";
import { riskActions, riskCategories, riskSeverities } from "@/modules/marketplace/risk-policy";
import { shipmentEventStatuses } from "@/modules/marketplace/shipping-policy";

export const listingConditionSchema = z.enum([
  "new_with_tags",
  "new_without_tags",
  "excellent",
  "good",
  "fair",
]);

export const photoRoleSchema = z.enum([
  "front",
  "back",
  "label",
  "defect",
  "sole",
  "packaging",
  "receipt",
  "serial",
  "other",
]);

export const requestUploadTicketSchema = z.object({
  role: photoRoleSchema.optional(),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(15 * 1024 * 1024)
    .optional(),
  checksumSha256: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/i)
    .optional(),
});

export const completeUploadSchema = z.object({
  publicUrl: z.string().url().optional(),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
  byteSize: z.number().int().positive().max(MAX_EVIDENCE_FILE_BYTES).optional(),
  checksumSha256: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/i)
    .optional(),
});

export const evidenceCategorySchema = z.enum(evidenceCategories);

export const requestEvidenceUploadTicketSchema = z.object({
  disputeId: z.string().min(1),
  category: evidenceCategorySchema,
  contentType: z.enum(EVIDENCE_CONTENT_TYPES),
  byteSize: z.number().int().positive().max(MAX_EVIDENCE_FILE_BYTES).optional(),
  checksumSha256: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/i)
    .optional(),
});

export const attachEvidenceSchema = z.object({
  disputeId: z.string().min(1),
  assetId: z.string().min(1),
  category: evidenceCategorySchema,
  note: z.string().trim().max(2000).optional(),
});

export const createListingSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().max(5000).optional(),
  brandId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  size: z.string().trim().max(40).optional(),
  condition: listingConditionSchema,
  priceNgn: z.number().int().positive().max(50_000_000),
  photos: z
    .array(
      z.object({
        url: z.string().url(),
        mediaAssetId: z.string().min(1).optional(),
        storageKey: z.string().min(1).optional(),
        role: photoRoleSchema,
        qualityScore: z.number().int().min(0).max(100).optional(),
        sortOrder: z.number().int().min(0).optional(),
      }),
    )
    .min(1),
});

export const decideReviewQueueItemSchema = z.object({
  decision: z.enum(["approve", "reject", "request_more_photos", "escalate"]),
  decisionReason: z.string().trim().min(3).max(4000),
  aiSignals: z.record(z.string(), z.unknown()).optional(),
});

export const createOrderSchema = z.object({
  listingId: z.string().min(1),
  shippingFeeNgn: z.number().int().min(0).max(500_000).default(0),
});

export const payOrderSchema = z.object({
  processor: z.enum(["paystack", "flutterwave", "manual"]).default("manual"),
  channel: z
    .enum(["card", "transfer", "ussd", "bank", "apple_pay", "google_pay"])
    .default("transfer"),
  reference: z.string().trim().min(3).max(120).optional(),
});

export const shipOrderSchema = z.object({
  courier: z.enum(["gig", "sendbox", "topship", "kwik", "dhl", "manual"]),
  trackingNumber: z.string().trim().min(3).max(120),
  labelUrl: z.string().url().optional(),
  hubCode: z.string().trim().max(80).optional(),
  insuredValueNgn: z.number().int().min(0).max(50_000_000).optional(),
});

const shipmentBaseSchema = z.object({
  courier: z.enum(["gig", "sendbox", "topship", "kwik", "dhl", "manual"]),
  trackingNumber: z.string().trim().min(3).max(120),
  labelUrl: z.string().url().optional(),
  hubCode: z.string().trim().max(80).optional(),
  insuredValueNgn: z.number().int().min(0).max(50_000_000).optional(),
});

export const createOrderShipmentSchema = shipmentBaseSchema.extend({
  orderId: z.string().min(1),
});

export const createBarterShipmentSchema = shipmentBaseSchema.extend({
  proposalId: z.string().min(1),
});

export const recordShipmentEventSchema = z.object({
  status: z.enum(shipmentEventStatuses),
  note: z.string().trim().max(240).optional(),
  location: z.string().trim().max(120).optional(),
});

export const openDisputeSchema = z.object({
  reasonCode: z.enum([
    "fake",
    "damaged",
    "not_as_described",
    "wrong_item",
    "never_arrived",
    "off_platform",
    "other",
  ]),
  evidence: z.record(z.string(), z.unknown()).optional(),
});

export const resolveDisputeSchema = z.object({
  decision: z.enum(disputeResolutionDecisions),
  resolution: z.string().trim().min(3).max(4000),
  sellerPayoutNgn: z.number().int().min(0).max(50_000_000).optional(),
  releasePayout: z.boolean().optional(),
});

export const transitionPayoutSchema = z.object({
  action: z.enum(payoutTransitionActions),
  processorReference: z.string().trim().min(3).max(160).optional(),
  note: z.string().trim().max(2000).optional(),
});

export const createReviewSchema = z.object({
  targetId: z.string().min(1),
  stars: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional(),
});

export const createBarterProposalSchema = z.object({
  targetListingId: z.string().min(1),
  offeredListingIds: z.array(z.string().min(1)).min(1).max(5),
});

export const createMessageThreadSchema = z
  .object({
    orderId: z.string().min(1).optional(),
    barterProposalId: z.string().min(1).optional(),
    participantId: z.string().min(1).optional(),
    topic: z.string().trim().max(240).optional(),
  })
  .refine(
    (input) =>
      [input.orderId, input.barterProposalId, input.participantId].filter(Boolean).length <= 1,
    "Create a message thread for one target at a time.",
  );

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const activateProSubscriptionSchema = z.object({
  tier: z.enum(proTiers),
});

export const createListingPromotionSchema = z.object({
  listingId: z.string().min(1),
  type: z.enum(promotionTypes),
});

export const signAuditBatchSchema = z.object({
  limit: z.number().int().positive().max(500).optional(),
});

export const auditSignedFilterSchema = z.enum(auditSignedFilters);

export const reportingRangeSchema = z.enum(reportingRanges);

export const riskCategorySchema = z.enum(riskCategories);

export const riskSeveritySchema = z.enum(riskSeverities);

export const applyRiskActionSchema = z.object({
  caseId: z.string().trim().min(3).max(240),
  action: z.enum(riskActions),
  note: z.string().trim().max(1000).optional(),
});
