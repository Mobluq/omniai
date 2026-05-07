export const payoutTransitionActions = [
  "start_processing",
  "mark_paid",
  "mark_failed",
  "cancel",
] as const;

export type PayoutTransitionAction = (typeof payoutTransitionActions)[number];

export type PayoutStatusName = "pending" | "queued" | "processing" | "paid" | "failed" | "cancelled";

export type PayoutTransitionPlan =
  | {
      allowed: true;
      nextStatus: PayoutStatusName;
      orderEscrowState: "release_pending" | "released";
      releasedAtMode: "set" | "clear" | "preserve";
    }
  | {
      allowed: false;
      reason: string;
    };

export function planPayoutTransition(
  currentStatus: PayoutStatusName,
  action: PayoutTransitionAction,
): PayoutTransitionPlan {
  if (action === "start_processing") {
    if (["pending", "queued", "failed"].includes(currentStatus)) {
      return {
        allowed: true,
        nextStatus: "processing",
        orderEscrowState: "release_pending",
        releasedAtMode: "clear",
      };
    }
    return { allowed: false, reason: "Only pending, queued, or failed payouts can start processing." };
  }

  if (action === "mark_paid") {
    if (["queued", "processing"].includes(currentStatus)) {
      return {
        allowed: true,
        nextStatus: "paid",
        orderEscrowState: "released",
        releasedAtMode: "set",
      };
    }
    return { allowed: false, reason: "Only queued or processing payouts can be marked paid." };
  }

  if (action === "mark_failed") {
    if (["queued", "processing"].includes(currentStatus)) {
      return {
        allowed: true,
        nextStatus: "failed",
        orderEscrowState: "release_pending",
        releasedAtMode: "clear",
      };
    }
    return { allowed: false, reason: "Only queued or processing payouts can fail." };
  }

  if (["pending", "queued", "failed"].includes(currentStatus)) {
    return {
      allowed: true,
      nextStatus: "cancelled",
      orderEscrowState: "release_pending",
      releasedAtMode: "clear",
    };
  }

  return { allowed: false, reason: "This payout cannot be cancelled from its current status." };
}
