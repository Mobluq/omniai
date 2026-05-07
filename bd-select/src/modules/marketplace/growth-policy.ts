import type { PromotionType, SubscriptionTier } from "@prisma/client";
import { addDays } from "@/modules/marketplace/constants";

export const proTiers = ["tier_1", "tier_2", "tier_3"] as const;
export const promotionTypes = ["bump", "featured", "drop"] as const;

export type ProTierName = (typeof proTiers)[number];
export type PromotionTypeName = (typeof promotionTypes)[number];

export type ProTierPlan = {
  tier: SubscriptionTier;
  label: string;
  priceNgn: number;
  listingLimit: number;
  promotionCredits: number;
  supportSlaHours: number;
};

export type PromotionPlan = {
  type: PromotionType;
  label: string;
  priceNgn: number;
  durationDays: number;
  description: string;
};

export const proTierPlans: Record<ProTierName, ProTierPlan> = {
  tier_1: {
    tier: "tier_1",
    label: "Pro Tier 1",
    priceNgn: 20_000,
    listingLimit: 25,
    promotionCredits: 2,
    supportSlaHours: 24,
  },
  tier_2: {
    tier: "tier_2",
    label: "Pro Tier 2",
    priceNgn: 50_000,
    listingLimit: 75,
    promotionCredits: 6,
    supportSlaHours: 12,
  },
  tier_3: {
    tier: "tier_3",
    label: "Pro Tier 3",
    priceNgn: 120_000,
    listingLimit: 200,
    promotionCredits: 16,
    supportSlaHours: 6,
  },
};

export const promotionPlans: Record<PromotionTypeName, PromotionPlan> = {
  bump: {
    type: "bump",
    label: "Bump",
    priceNgn: 1_500,
    durationDays: 7,
    description: "Refreshes listing priority inside marketplace browsing.",
  },
  featured: {
    type: "featured",
    label: "Featured",
    priceNgn: 8_000,
    durationDays: 14,
    description: "Adds premium placement in category and search surfaces.",
  },
  drop: {
    type: "drop",
    label: "Drop",
    priceNgn: 25_000,
    durationDays: 7,
    description: "Groups a seller item into an editorial drop campaign.",
  },
};

export function planProSubscription(tier: SubscriptionTier) {
  return proTierPlans[tier];
}

export function planListingPromotion(type: PromotionType, startsAt = new Date()) {
  const plan = promotionPlans[type];
  return {
    ...plan,
    startsAt,
    endsAt: addDays(startsAt, plan.durationDays),
  };
}

export function isProTier(value: string | null): value is ProTierName {
  return proTiers.some((tier) => tier === value);
}

export function isPromotionType(value: string | null): value is PromotionTypeName {
  return promotionTypes.some((type) => type === value);
}
