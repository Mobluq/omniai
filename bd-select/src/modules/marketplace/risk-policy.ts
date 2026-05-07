export const riskCategories = [
  "identity",
  "listing",
  "messaging",
  "payment",
  "logistics",
  "dispute",
  "barter",
] as const;

export type RiskCategory = (typeof riskCategories)[number];

export const riskSeverities = ["low", "medium", "high", "critical"] as const;
export type RiskSeverity = (typeof riskSeverities)[number];

export const riskActions = ["acknowledge", "escalate"] as const;
export type RiskAction = (typeof riskActions)[number];

export type RiskSignal = {
  label: string;
  detail: string;
  weight: number;
};

export type RiskCase = {
  id: string;
  entity:
    | "User"
    | "Listing"
    | "MessageThread"
    | "Order"
    | "Shipment"
    | "Dispute"
    | "BarterProposal";
  entityId: string;
  category: RiskCategory;
  severity: RiskSeverity;
  score: number;
  title: string;
  summary: string;
  href: string;
  status: "open" | "reviewed";
  recommendedAction: RiskAction;
  signals: RiskSignal[];
  actor?: { id: string; name: string | null; email: string | null; role?: string } | null;
  createdAt: string;
  updatedAt: string;
};

export function riskSeverityFromScore(score: number): RiskSeverity {
  if (score >= 90) return "critical";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function riskScoreFromSignals(signals: RiskSignal[]) {
  return Math.max(
    0,
    Math.min(
      100,
      signals.reduce((score, signal) => score + signal.weight, 0),
    ),
  );
}

export function makeRiskCase(input: Omit<RiskCase, "severity" | "score">): RiskCase {
  const score = riskScoreFromSignals(input.signals);
  return {
    ...input,
    score,
    severity: riskSeverityFromScore(score),
  };
}

export function riskSlaLabel(severity: RiskSeverity) {
  if (severity === "critical") return "Review within 1 hour";
  if (severity === "high") return "Review today";
  if (severity === "medium") return "Review this week";
  return "Monitor";
}

export function riskCaseKind(caseId: string) {
  const [kind, entityId] = caseId.split(":");
  return { kind, entityId };
}
