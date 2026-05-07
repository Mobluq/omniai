import assert from "node:assert/strict";
import { toSlug } from "@/lib/naming/slug";
import { hashSensitiveText, sanitizeUserText } from "@/lib/security/request-context";
import {
  hasMarketplacePii,
  redactMarketplacePii,
  redactSensitiveText,
} from "@/lib/security/redaction";
import {
  canListItems,
  canManageMarketplace,
  canManageSecurity,
  canReviewListings,
} from "@/modules/identity/role-policy";
import {
  auditSignaturePayload,
  signAuditLog,
  verifyAuditSignature,
} from "@/modules/marketplace/audit-policy";
import {
  evidenceFileState,
  evidenceRecordVersion,
  isAllowedEvidenceContentType,
  mergeEvidenceFile,
  normalizeEvidenceRecord,
} from "@/modules/marketplace/evidence-policy";
import {
  hashOtpCode,
  isValidIdentityIdentifier,
  normalizeIdentityIdentifier,
  otpExpiresAt,
} from "@/modules/identity/otp-policy";
import {
  hasRequiredListingPhotos,
  missingRequiredPhotoRoles,
  reviewSlaDueAt,
} from "@/modules/marketplace/listing-policy";
import { calculateBarterValuation } from "@/modules/marketplace/barter-policy";
import { planDisputeResolution } from "@/modules/marketplace/dispute-policy";
import { planListingPromotion, planProSubscription } from "@/modules/marketplace/growth-policy";
import {
  average,
  dailySeries,
  percent,
  reportingRangeStart,
} from "@/modules/marketplace/insights-policy";
import {
  notificationState,
  notificationTypeLabel,
} from "@/modules/marketplace/notification-policy";
import { planPayoutTransition } from "@/modules/marketplace/payout-policy";
import {
  makeRiskCase,
  riskSeverityFromScore,
  riskSlaLabel,
} from "@/modules/marketplace/risk-policy";
import {
  appendShipmentEvent,
  normalizeShipmentEvents,
  shipmentRisk,
  shouldMoveBarterToReview,
} from "@/modules/marketplace/shipping-policy";
import {
  imageExtensionForContentType,
  isAllowedImageContentType,
  qualityScoreFromImageMetadata,
} from "@/modules/marketplace/media-policy";
import { calculateAuthenticationFeeNgn, calculateOrderQuote } from "@/modules/marketplace/pricing";

function run() {
  assert.equal(toSlug("  BD Select: Lagos Closet! "), "bd-select-lagos-closet");
  assert.equal(toSlug("Multiple---Separators"), "multiple-separators");

  assert.equal(canListItems("seller", "verified"), true);
  assert.equal(canListItems("seller", "pending"), false);
  assert.equal(canReviewListings("authenticator"), true);
  assert.equal(canManageMarketplace("admin"), true);
  assert.equal(canManageMarketplace("seller"), false);
  assert.equal(canManageSecurity("super_admin"), true);

  assert.equal(normalizeIdentityIdentifier(" Test@BDSelect.Local "), "test@bdselect.local");
  assert.equal(normalizeIdentityIdentifier("+234 801 234 5678"), "08012345678");
  assert.equal(isValidIdentityIdentifier("buyer@bdselect.local"), true);
  assert.equal(isValidIdentityIdentifier("08012345678"), true);
  assert.equal(isValidIdentityIdentifier("12345"), false);
  assert.equal(
    hashOtpCode("buyer@bdselect.local", "sign_in", "000000", "secret"),
    hashOtpCode(" BUYER@BDSELECT.LOCAL ", "sign_in", "000000", "secret"),
  );
  assert.equal(
    otpExpiresAt(new Date("2026-05-07T12:00:00.000Z")).toISOString(),
    "2026-05-07T12:10:00.000Z",
  );

  assert.match(redactSensitiveText("Authorization: Bearer abc.def.ghi"), /\[redacted\]/);
  assert.equal(hasMarketplacePii("message me on 08012345678"), true);
  assert.match(redactMarketplacePii("message me on 08012345678"), /\[redacted-contact\]/);
  assert.equal(hasMarketplacePii("see www.example.com or @directseller"), true);
  assert.match(
    redactMarketplacePii("see www.example.com or @directseller"),
    /\[redacted-contact\]/,
  );
  assert.equal(sanitizeUserText("hello\u0000"), "hello");
  assert.equal(hashSensitiveText("same input"), hashSensitiveText("same input"));

  assert.equal(
    hasRequiredListingPhotos(["front", "back", "label", "defect", "sole", "packaging"]),
    true,
  );
  assert.deepEqual(missingRequiredPhotoRoles(["front", "back", "label", "defect", "sole"]), [
    "packaging",
  ]);

  const baseline = new Date("2026-05-06T12:00:00.000Z");
  assert.equal(reviewSlaDueAt(90_000, baseline).toISOString(), "2026-05-07T12:00:00.000Z");
  assert.equal(reviewSlaDueAt(250_000, baseline).toISOString(), "2026-05-07T00:00:00.000Z");
  assert.equal(reviewSlaDueAt(900_000, baseline).toISOString(), "2026-05-06T18:00:00.000Z");
  assert.equal(reviewSlaDueAt(2_500_000, baseline).toISOString(), "2026-05-06T16:00:00.000Z");

  assert.equal(calculateAuthenticationFeeNgn(95_000), 0);
  assert.equal(calculateAuthenticationFeeNgn(250_000), 1_500);
  assert.equal(calculateAuthenticationFeeNgn(900_000), 3_000);
  assert.equal(calculateAuthenticationFeeNgn(2_500_000), 5_000);

  assert.equal(isAllowedImageContentType("image/jpeg"), true);
  assert.equal(isAllowedImageContentType("image/gif"), false);
  assert.equal(imageExtensionForContentType("image/webp"), "webp");
  assert.equal(qualityScoreFromImageMetadata({ width: 1600, height: 1400, byteSize: 450000 }), 100);
  assert.equal(qualityScoreFromImageMetadata({ width: 700, height: 700, byteSize: 45000 }), 50);
  assert.equal(isAllowedEvidenceContentType("application/pdf"), true);
  assert.equal(isAllowedEvidenceContentType("video/mp4"), false);
  const evidence = mergeEvidenceFile(normalizeEvidenceRecord({ source: "legacy" }), {
    id: "evidence-file-1",
    assetId: "media-1",
    url: "https://bdselect.local/evidence/media-1",
    category: "delivery",
    contentType: "application/pdf",
    byteSize: 120000,
    checksumSha256: null,
    uploadedById: "buyer-1",
    note: "Courier receipt",
    redacted: false,
    attachedAt: "2026-05-07T12:00:00.000Z",
  });
  assert.equal(evidence.version, evidenceRecordVersion);
  assert.deepEqual(evidenceFileState(evidence), {
    totalFiles: 1,
    hasDeliveryEvidence: true,
    hasAuthenticationEvidence: false,
    countsByCategory: { delivery: 1 },
  });

  assert.deepEqual(calculateOrderQuote(95_000, 2_000), {
    grossNgn: 95_000,
    buyerFeeNgn: 3_800,
    sellerFeeNgn: 7_600,
    authenticationFeeNgn: 0,
    paymentFeeNgn: 1_613,
    shippingFeeNgn: 2_000,
    payoutNgn: 87_400,
    buyerTotalNgn: 100_800,
  });

  assert.deepEqual(planDisputeResolution("refund_buyer"), {
    disputeStatus: "resolved_refund",
    orderStatus: "refunded",
    escrowState: "refunded",
    listingStatus: "live",
    defaultReleasePayout: false,
  });
  assert.deepEqual(planDisputeResolution("reject_claim"), {
    disputeStatus: "rejected",
    orderStatus: "completed",
    escrowState: "release_pending",
    listingStatus: "sold",
    defaultReleasePayout: true,
  });
  assert.deepEqual(calculateBarterValuation(200_000, 185_000, "seller-a", "seller-b"), {
    targetValueNgn: 200_000,
    offeredValueNgn: 185_000,
    deltaNgn: 15_000,
    topUpNgn: 15_000,
    topUpPayerId: "seller-b",
  });
  assert.deepEqual(calculateBarterValuation(200_000, 192_000, "seller-a", "seller-b"), {
    targetValueNgn: 200_000,
    offeredValueNgn: 192_000,
    deltaNgn: 8_000,
    topUpNgn: 0,
    topUpPayerId: null,
  });
  assert.equal(planProSubscription("tier_2").listingLimit, 75);
  assert.equal(planProSubscription("tier_3").promotionCredits, 16);
  assert.equal(
    planListingPromotion("featured", new Date("2026-05-07T12:00:00.000Z")).endsAt.toISOString(),
    "2026-05-21T12:00:00.000Z",
  );
  assert.deepEqual(planPayoutTransition("queued", "mark_paid"), {
    allowed: true,
    nextStatus: "paid",
    orderEscrowState: "released",
    releasedAtMode: "set",
  });
  assert.deepEqual(planPayoutTransition("paid", "mark_failed"), {
    allowed: false,
    reason: "Only queued or processing payouts can fail.",
  });
  assert.equal(notificationState(null, null), "unread");
  assert.equal(notificationState(new Date("2026-05-07T12:00:00.000Z"), null), "read");
  assert.equal(notificationState(null, new Date("2026-05-07T12:00:00.000Z")), "archived");
  assert.equal(notificationTypeLabel("authentication"), "Authentication");
  assert.equal(
    reportingRangeStart("7d", new Date("2026-05-07T12:00:00.000Z"))?.toISOString(),
    "2026-04-30T12:00:00.000Z",
  );
  assert.equal(reportingRangeStart("all", new Date("2026-05-07T12:00:00.000Z")), null);
  assert.equal(percent(25, 100), 25);
  assert.equal(percent(1, 3), 33.33);
  assert.equal(average([100, 200]), 150);
  assert.deepEqual(
    dailySeries(
      [
        { at: "2026-05-07T12:00:00.000Z", value: 100 },
        { at: "2026-05-07T16:00:00.000Z", value: 250 },
        { at: "2026-05-06T12:00:00.000Z", value: 75 },
      ],
      (item) => item.at,
      (item) => item.value,
    ),
    [
      { date: "2026-05-06", count: 1, totalNgn: 75 },
      { date: "2026-05-07", count: 2, totalNgn: 350 },
    ],
  );
  assert.equal(riskSeverityFromScore(95), "critical");
  assert.equal(riskSeverityFromScore(75), "high");
  assert.equal(riskSeverityFromScore(45), "medium");
  assert.equal(riskSlaLabel("critical"), "Review within 1 hour");
  assert.equal(
    makeRiskCase({
      id: "listing:test",
      entity: "Listing",
      entityId: "test",
      category: "listing",
      title: "Risky listing",
      summary: "Restricted brand",
      href: "/admin",
      status: "open",
      recommendedAction: "escalate",
      signals: [
        { label: "Restricted", detail: "Restricted brand", weight: 30 },
        { label: "High value", detail: "Expensive listing", weight: 20 },
      ],
      createdAt: "2026-05-07T12:00:00.000Z",
      updatedAt: "2026-05-07T12:00:00.000Z",
    }).severity,
    "medium",
  );
  assert.deepEqual(
    normalizeShipmentEvents([
      { status: "delivered", at: "2026-05-07T14:00:00.000Z", source: "operator" },
      { status: "in_transit", at: "2026-05-07T12:00:00.000Z", source: "seed" },
      { status: "unknown", at: "2026-05-07T13:00:00.000Z" },
    ]).map((event) => event.status),
    ["in_transit", "delivered"],
  );
  assert.equal(
    appendShipmentEvent([], {
      status: "failed",
      at: "2026-05-07T12:00:00.000Z",
      note: "Carrier exception",
    })[0].source,
    "operator",
  );
  assert.equal(shipmentRisk("failed"), "exception");
  assert.equal(shipmentRisk("delivered"), "closed");
  assert.equal(shouldMoveBarterToReview(["delivered", "delivered"]), true);
  assert.equal(shouldMoveBarterToReview(["in_transit", "delivered"]), false);
  const auditLog = {
    id: "audit-1",
    actorId: "admin-1",
    action: "listing.approved",
    entity: "Listing",
    entityId: "listing-1",
    beforeState: { status: "in_review" },
    afterState: { status: "live" },
    ipAddress: null,
    userAgent: null,
    requestId: "request-1",
    metadata: { source: "test" },
    createdAt: new Date("2026-05-07T12:00:00.000Z"),
  };
  assert.equal(
    auditSignaturePayload(auditLog),
    auditSignaturePayload({ ...auditLog, afterState: { status: "live" } }),
  );
  assert.equal(verifyAuditSignature({ ...auditLog, signature: signAuditLog(auditLog) }), true);
  assert.equal(signAuditLog(auditLog, "secret"), signAuditLog(auditLog, "secret"));

  console.log("All BD Select foundation assertions passed.");
}

run();
