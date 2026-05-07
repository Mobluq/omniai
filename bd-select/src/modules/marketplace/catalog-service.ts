import type { ListingCondition, PhotoRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sanitizeUserText } from "@/lib/security/request-context";
import { toSlug } from "@/lib/naming/slug";
import { canListItems } from "@/modules/identity/role-policy";
import { assertMarketplace } from "@/modules/marketplace/errors";
import {
  canSubmitListing,
  hasRequiredListingPhotos,
  missingRequiredPhotoRoles,
  reviewSlaDueAt,
} from "@/modules/marketplace/listing-policy";

export type CreateListingInput = {
  sellerId: string;
  title: string;
  description?: string;
  brandId?: string;
  categoryId?: string;
  size?: string;
  condition: ListingCondition;
  priceNgn: number;
  photos: {
    url: string;
    mediaAssetId?: string;
    storageKey?: string;
    role: PhotoRole;
    qualityScore?: number;
    sortOrder?: number;
  }[];
};

export type SearchListingsInput = {
  query?: string;
  brandId?: string;
  categoryId?: string;
  minPriceNgn?: number;
  maxPriceNgn?: number;
};

async function uniqueListingSlug(
  tx: Prisma.TransactionClient,
  sellerId: string,
  title: string,
) {
  const baseSlug = toSlug(title) || "listing";
  let slug = baseSlug;
  let suffix = 2;

  while (
    await tx.listing.findUnique({
      where: { sellerId_slug: { sellerId, slug } },
      select: { id: true },
    })
  ) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export class CatalogService {
  async taxonomy() {
    const [brands, categories] = await Promise.all([
      prisma.brand.findMany({ orderBy: { name: "asc" } }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
    ]);

    return { brands, categories };
  }

  async searchListings(input: SearchListingsInput) {
    const query = input.query?.trim();

    return prisma.listing.findMany({
      where: {
        status: "live",
        brandId: input.brandId,
        categoryId: input.categoryId,
        priceNgn: {
          gte: input.minPriceNgn,
          lte: input.maxPriceNgn,
        },
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
                { brand: { name: { contains: query, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        brand: true,
        category: true,
        photos: { orderBy: { sortOrder: "asc" } },
        seller: { select: { id: true, name: true, sellerScore: true } },
      },
      orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
      take: 60,
    });
  }

  async listSellerListings(sellerId: string) {
    return prisma.listing.findMany({
      where: { sellerId },
      include: {
        brand: true,
        category: true,
        photos: { orderBy: { sortOrder: "asc" } },
        reviewQueueItems: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async getPublicListing(listingId: string) {
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, status: "live" },
      include: {
        brand: true,
        category: true,
        photos: { orderBy: { sortOrder: "asc" } },
        seller: { select: { id: true, name: true, sellerScore: true } },
      },
    });

    assertMarketplace(listing, "listing_not_found", "Listing is not available.", 404);
    return listing;
  }

  async createListing(input: CreateListingInput) {
    return prisma.$transaction(async (tx) => {
      const seller = await tx.user.findUnique({
        where: { id: input.sellerId },
        select: { id: true, role: true, kycStatus: true },
      });

      assertMarketplace(seller, "seller_not_found", "Seller account was not found.", 404);
      assertMarketplace(
        canListItems(seller.role, seller.kycStatus),
        "kyc_required",
        "Verified seller KYC is required before listing items.",
        403,
      );

      const slug = await uniqueListingSlug(tx, input.sellerId, input.title);
      const mediaAssetIds = input.photos
        .map((photo) => photo.mediaAssetId)
        .filter((value): value is string => Boolean(value));

      if (mediaAssetIds.length > 0) {
        const assets = await tx.mediaAsset.findMany({
          where: { id: { in: mediaAssetIds } },
          select: { id: true, ownerId: true, status: true },
        });

        assertMarketplace(
          assets.length === new Set(mediaAssetIds).size,
          "media_asset_not_found",
          "Every attached media asset must exist.",
          404,
        );
        assertMarketplace(
          assets.every((asset) => asset.ownerId === input.sellerId),
          "forbidden",
          "Only owned media assets can be attached to listings.",
          403,
        );
        assertMarketplace(
          assets.every((asset) => asset.status === "uploaded"),
          "invalid_media_state",
          "Media assets must be uploaded before listing creation.",
          409,
        );
      }

      const listing = await tx.listing.create({
        data: {
          sellerId: input.sellerId,
          title: sanitizeUserText(input.title),
          slug,
          description: input.description ? sanitizeUserText(input.description) : undefined,
          brandId: input.brandId,
          categoryId: input.categoryId,
          size: input.size ? sanitizeUserText(input.size) : undefined,
          condition: input.condition,
          priceNgn: input.priceNgn,
          photos: {
            create: input.photos.map((photo, index) => ({
              url: photo.url,
              mediaAssetId: photo.mediaAssetId,
              storageKey: photo.storageKey,
              role: photo.role,
              qualityScore: photo.qualityScore,
              sortOrder: photo.sortOrder ?? index,
            })),
          },
        },
        include: { photos: true },
      });

      if (mediaAssetIds.length > 0) {
        await tx.mediaAsset.updateMany({
          where: { id: { in: mediaAssetIds } },
          data: { listingId: listing.id, status: "attached" },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: input.sellerId,
          action: "listing.created",
          entity: "Listing",
          entityId: listing.id,
          afterState: { status: listing.status },
        },
      });

      return listing;
    });
  }

  async submitListing(sellerId: string, listingId: string) {
    return prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: listingId },
        include: { photos: true },
      });

      assertMarketplace(listing, "listing_not_found", "Listing was not found.", 404);
      assertMarketplace(listing.sellerId === sellerId, "forbidden", "Only the seller can submit this listing.", 403);
      assertMarketplace(
        canSubmitListing(listing.status),
        "invalid_listing_state",
        "Only draft or needs-more-info listings can be submitted.",
        409,
      );

      const photoRoles = listing.photos.map((photo) => photo.role);
      assertMarketplace(
        hasRequiredListingPhotos(photoRoles),
        "listing_photos_incomplete",
        `Listing requires front, back, label, defect, sole, and packaging photos. Missing: ${missingRequiredPhotoRoles(photoRoles).join(", ") || "none"}.`,
        422,
      );

      const now = new Date();
      const updatedListing = await tx.listing.update({
        where: { id: listing.id },
        data: {
          status: "in_review",
          submittedAt: now,
          rejectedAt: null,
        },
      });

      const queueItem = await tx.reviewQueueItem.create({
        data: {
          listingId: listing.id,
          status: "queued",
          slaDueAt: reviewSlaDueAt(listing.priceNgn, now),
          aiSignals: {
            authenticityScore: listing.aiAuthenticityScore,
            priceScore: listing.aiPriceScore,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: sellerId,
          action: "listing.submitted_for_review",
          entity: "Listing",
          entityId: listing.id,
          beforeState: { status: listing.status },
          afterState: { status: updatedListing.status, queueItemId: queueItem.id },
        },
      });

      return { listing: updatedListing, queueItem };
    });
  }
}
