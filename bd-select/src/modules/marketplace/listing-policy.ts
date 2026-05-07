import type { ListingStatus, PhotoRole } from "@prisma/client";
import {
  LISTING_MIN_PHOTOS,
  REQUIRED_LISTING_PHOTO_ROLES,
  addHours,
} from "@/modules/marketplace/constants";

export function missingRequiredPhotoRoles(roles: PhotoRole[]) {
  const submitted = new Set(roles);
  return REQUIRED_LISTING_PHOTO_ROLES.filter((role) => !submitted.has(role));
}

export function canSubmitListing(status: ListingStatus) {
  return status === "draft" || status === "needs_more_info";
}

export function hasRequiredListingPhotos(roles: PhotoRole[]) {
  return roles.length >= LISTING_MIN_PHOTOS && missingRequiredPhotoRoles(roles).length === 0;
}

export function reviewSlaDueAt(priceNgn: number, now = new Date()) {
  if (priceNgn < 100_000) return addHours(now, 24);
  if (priceNgn <= 500_000) return addHours(now, 12);
  if (priceNgn <= 2_000_000) return addHours(now, 6);
  return addHours(now, 4);
}
