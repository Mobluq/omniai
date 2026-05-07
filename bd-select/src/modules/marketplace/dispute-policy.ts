export const disputeResolutionDecisions = [
  "refund_buyer",
  "partial_payout",
  "require_return",
  "reject_claim",
  "close_no_action",
] as const;

export type DisputeResolutionDecision = (typeof disputeResolutionDecisions)[number];

export type DisputeResolutionPlan = {
  disputeStatus: "resolved_refund" | "resolved_partial" | "resolved_return" | "rejected" | "closed";
  orderStatus: "refunded" | "completed";
  escrowState: "refunded" | "release_pending";
  listingStatus: "live" | "sold";
  defaultReleasePayout: boolean;
};

export function planDisputeResolution(decision: DisputeResolutionDecision): DisputeResolutionPlan {
  if (decision === "refund_buyer") {
    return {
      disputeStatus: "resolved_refund",
      orderStatus: "refunded",
      escrowState: "refunded",
      listingStatus: "live",
      defaultReleasePayout: false,
    };
  }

  if (decision === "partial_payout") {
    return {
      disputeStatus: "resolved_partial",
      orderStatus: "completed",
      escrowState: "release_pending",
      listingStatus: "sold",
      defaultReleasePayout: true,
    };
  }

  if (decision === "require_return") {
    return {
      disputeStatus: "resolved_return",
      orderStatus: "refunded",
      escrowState: "refunded",
      listingStatus: "live",
      defaultReleasePayout: false,
    };
  }

  if (decision === "reject_claim") {
    return {
      disputeStatus: "rejected",
      orderStatus: "completed",
      escrowState: "release_pending",
      listingStatus: "sold",
      defaultReleasePayout: true,
    };
  }

  return {
    disputeStatus: "closed",
    orderStatus: "completed",
    escrowState: "release_pending",
    listingStatus: "sold",
    defaultReleasePayout: true,
  };
}
