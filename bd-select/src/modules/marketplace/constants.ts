import type { PhotoRole } from "@prisma/client";

export const REQUIRED_LISTING_PHOTO_ROLES = [
  "front",
  "back",
  "label",
  "defect",
  "sole",
  "packaging",
] satisfies PhotoRole[];

export const LISTING_MIN_PHOTOS = 6;
export const BUYER_FEE_BPS = 400;
export const SELLER_FEE_BPS = 800;
export const PAYMENT_COST_BPS = 160;
export const AUTO_CONFIRM_HOURS = 72;
export const DISPUTE_WINDOW_DAYS = 7;
export const BARTER_PROPOSAL_EXPIRY_HOURS = 72;
export const BARTER_TOP_UP_THRESHOLD_NGN = 10_000;

export function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number) {
  return addHours(date, days * 24);
}
