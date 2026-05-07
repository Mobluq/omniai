import type { PromotionType, SubscriptionTier } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { canListItems } from "@/modules/identity/role-policy";
import { assertMarketplace } from "@/modules/marketplace/errors";
import {
  planListingPromotion,
  planProSubscription,
  promotionPlans,
  proTierPlans,
} from "@/modules/marketplace/growth-policy";
import { createMarketplaceNotifications } from "@/modules/marketplace/notification-events";

export type ActivateProSubscriptionInput = {
  sellerId: string;
  tier: SubscriptionTier;
};

export type CreateListingPromotionInput = {
  sellerId: string;
  listingId: string;
  type: PromotionType;
};

export class GrowthService {
  async getSellerGrowth(sellerId: string) {
    const user = await prisma.user.findUnique({
      where: { id: sellerId },
      select: { id: true, role: true, kycStatus: true },
    });

    assertMarketplace(user, "seller_not_found", "Seller account was not found.", 404);
    assertMarketplace(
      canListItems(user.role, user.kycStatus),
      "seller_required",
      "Verified seller status is required for growth tooling.",
      403,
    );

    const [profile, listings, activeSubscription, subscriptions] = await Promise.all([
      prisma.sellerProfile.findUnique({
        where: { userId: sellerId },
        select: {
          id: true,
          userId: true,
          storeName: true,
          storeSlug: true,
          bio: true,
          proApprovedAt: true,
          listingLimit: true,
          defaultHubCode: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.listing.findMany({
        where: { sellerId },
        include: {
          brand: true,
          category: true,
          photos: { orderBy: { sortOrder: "asc" }, take: 1 },
          promotions: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.proSubscription.findFirst({
        where: { sellerProfile: { userId: sellerId }, status: { in: ["trialing", "active", "past_due"] } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.proSubscription.findMany({
        where: { sellerProfile: { userId: sellerId } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    assertMarketplace(profile, "seller_profile_required", "Seller profile is required for growth tooling.", 403);

    return {
      profile,
      activeSubscription,
      subscriptions,
      listings,
      proTierPlans: Object.values(proTierPlans),
      promotionPlans: Object.values(promotionPlans),
    };
  }

  async activateProSubscription(input: ActivateProSubscriptionInput) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: input.sellerId },
        include: { sellerProfile: true },
      });

      assertMarketplace(user, "seller_not_found", "Seller account was not found.", 404);
      assertMarketplace(
        canListItems(user.role, user.kycStatus),
        "seller_required",
        "Verified seller status is required before activating Pro.",
        403,
      );
      assertMarketplace(user.sellerProfile, "seller_profile_required", "Seller profile is required before activating Pro.", 403);

      const plan = planProSubscription(input.tier);
      await tx.proSubscription.updateMany({
        where: {
          sellerProfileId: user.sellerProfile.id,
          status: { in: ["trialing", "active", "past_due"] },
        },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
        },
      });

      const subscription = await tx.proSubscription.create({
        data: {
          sellerProfileId: user.sellerProfile.id,
          tier: plan.tier,
          status: "active",
          priceNgn: plan.priceNgn,
          metadata: {
            source: "local_growth_console",
            promotionCredits: plan.promotionCredits,
            supportSlaHours: plan.supportSlaHours,
          },
        },
      });

      await tx.sellerProfile.update({
        where: { id: user.sellerProfile.id },
        data: {
          proApprovedAt: new Date(),
          listingLimit: plan.listingLimit,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.sellerId,
          action: "seller.pro_subscription_activated",
          entity: "ProSubscription",
          entityId: subscription.id,
          afterState: {
            tier: subscription.tier,
            status: subscription.status,
            priceNgn: subscription.priceNgn,
            listingLimit: plan.listingLimit,
          },
        },
      });

      await createMarketplaceNotifications(tx, [
        {
          userId: input.sellerId,
          type: "system",
          title: "Pro seller plan activated",
          body: `${plan.label} is active for your BD Select seller profile.`,
          actionUrl: "/seller/growth",
          metadata: {
            subscriptionId: subscription.id,
            tier: subscription.tier,
            listingLimit: plan.listingLimit,
          },
        },
      ]);

      return subscription;
    });
  }

  async createListingPromotion(input: CreateListingPromotionInput) {
    return prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: input.listingId },
        include: { seller: { include: { sellerProfile: true } } },
      });

      assertMarketplace(listing, "listing_not_found", "Listing was not found.", 404);
      assertMarketplace(listing.sellerId === input.sellerId, "forbidden", "Only the seller can promote this listing.", 403);
      assertMarketplace(
        ["live", "reserved"].includes(listing.status),
        "invalid_listing_state",
        "Only live or reserved listings can be promoted.",
        409,
      );
      assertMarketplace(
        listing.seller.sellerProfile,
        "seller_profile_required",
        "Seller profile is required before promoting listings.",
        403,
      );

      const activeSubscription = await tx.proSubscription.findFirst({
        where: {
          sellerProfileId: listing.seller.sellerProfile.id,
          status: { in: ["trialing", "active"] },
        },
        orderBy: { createdAt: "desc" },
      });

      assertMarketplace(
        activeSubscription,
        "pro_required",
        "An active Pro seller subscription is required before creating promotions.",
        403,
      );

      const planned = planListingPromotion(input.type);
      const promotion = await tx.listingPromotion.create({
        data: {
          listingId: listing.id,
          type: planned.type,
          status: "active",
          priceNgn: planned.priceNgn,
          startsAt: planned.startsAt,
          endsAt: planned.endsAt,
          metadata: {
            source: "local_growth_console",
            subscriptionId: activeSubscription.id,
            durationDays: planned.durationDays,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.sellerId,
          action: "listing.promotion_created",
          entity: "ListingPromotion",
          entityId: promotion.id,
          afterState: {
            listingId: listing.id,
            type: promotion.type,
            status: promotion.status,
            priceNgn: promotion.priceNgn,
          },
        },
      });

      await createMarketplaceNotifications(tx, [
        {
          userId: input.sellerId,
          type: "listing",
          title: "Listing promotion active",
          body: `${planned.label} promotion is active for ${listing.title}.`,
          actionUrl: "/seller/growth",
          metadata: {
            listingId: listing.id,
            promotionId: promotion.id,
            type: promotion.type,
          },
        },
      ]);

      return promotion;
    });
  }
}
