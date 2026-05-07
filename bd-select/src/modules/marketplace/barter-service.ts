import { prisma } from "@/lib/db/prisma";
import { calculateBarterValuation } from "@/modules/marketplace/barter-policy";
import { addHours, BARTER_PROPOSAL_EXPIRY_HOURS } from "@/modules/marketplace/constants";
import { assertMarketplace } from "@/modules/marketplace/errors";
import { createMarketplaceNotifications } from "@/modules/marketplace/notification-events";

export type CreateBarterProposalInput = {
  initiatorId: string;
  targetListingId: string;
  offeredListingIds: string[];
};

export class BarterService {
  async listForUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    assertMarketplace(user, "user_not_found", "User account was not found.", 404);

    return prisma.barterProposal.findMany({
      where: {
        OR: [{ initiatorId: userId }, { recipientId: userId }],
      },
      include: {
        initiator: { select: { id: true, name: true, email: true } },
        recipient: { select: { id: true, name: true, email: true } },
        topUpPayer: { select: { id: true, name: true, email: true } },
        targetListing: {
          include: {
            brand: true,
            category: true,
            photos: { orderBy: { sortOrder: "asc" }, take: 1 },
            seller: { select: { id: true, name: true, sellerScore: true } },
          },
        },
        offeredListings: {
          include: {
            offeredBy: { select: { id: true, name: true, email: true } },
            listing: {
              include: {
                brand: true,
                category: true,
                photos: { orderBy: { sortOrder: "asc" }, take: 1 },
                seller: { select: { id: true, name: true, sellerScore: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        payments: { orderBy: { createdAt: "desc" } },
        shipments: { orderBy: { createdAt: "desc" } },
        disputes: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async createProposal(input: CreateBarterProposalInput) {
    return prisma.$transaction(async (tx) => {
      const targetListing = await tx.listing.findUnique({ where: { id: input.targetListingId } });

      assertMarketplace(targetListing, "target_listing_not_found", "Target listing was not found.", 404);
      assertMarketplace(targetListing.status === "live", "target_listing_unavailable", "Target listing is not available for barter.", 409);
      assertMarketplace(targetListing.sellerId !== input.initiatorId, "invalid_barter", "Users cannot barter against their own listing.", 409);

      const offeredListings = await tx.listing.findMany({
        where: {
          id: { in: input.offeredListingIds },
          sellerId: input.initiatorId,
        },
      });

      assertMarketplace(
        offeredListings.length === new Set(input.offeredListingIds).size,
        "offered_listing_not_found",
        "Every offered listing must belong to the initiator.",
        404,
      );
      assertMarketplace(
        offeredListings.every((listing) => listing.status === "live"),
        "offered_listing_unavailable",
        "Offered listings must be live.",
        409,
      );

      const offeredValueNgn = offeredListings.reduce((sum, listing) => sum + listing.priceNgn, 0);
      const valuation = calculateBarterValuation(
        targetListing.priceNgn,
        offeredValueNgn,
        targetListing.sellerId,
        input.initiatorId,
      );

      const proposal = await tx.barterProposal.create({
        data: {
          initiatorId: input.initiatorId,
          recipientId: targetListing.sellerId,
          targetListingId: targetListing.id,
          topUpNgn: valuation.topUpNgn,
          topUpPayerId: valuation.topUpPayerId,
          valuationSnapshot: valuation,
          expiresAt: addHours(new Date(), BARTER_PROPOSAL_EXPIRY_HOURS),
          offeredListings: {
            create: offeredListings.map((listing) => ({
              listingId: listing.id,
              offeredById: input.initiatorId,
            })),
          },
        },
        include: {
          initiator: { select: { id: true, name: true, email: true } },
          recipient: { select: { id: true, name: true, email: true } },
          topUpPayer: { select: { id: true, name: true, email: true } },
          targetListing: {
            include: {
              brand: true,
              category: true,
              photos: { orderBy: { sortOrder: "asc" }, take: 1 },
              seller: { select: { id: true, name: true, sellerScore: true } },
            },
          },
          offeredListings: {
            include: {
              offeredBy: { select: { id: true, name: true, email: true } },
              listing: {
                include: {
                  brand: true,
                  category: true,
                  photos: { orderBy: { sortOrder: "asc" }, take: 1 },
                  seller: { select: { id: true, name: true, sellerScore: true } },
                },
              },
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.initiatorId,
          action: "barter.proposal_created",
          entity: "BarterProposal",
          entityId: proposal.id,
          afterState: { status: proposal.status, topUpNgn: proposal.topUpNgn },
        },
      });

      await createMarketplaceNotifications(tx, [
        {
          userId: proposal.recipientId,
          type: "barter",
          title: "New barter proposal",
          body: "A seller proposed a BD Select swap with valuation and top-up details.",
          actionUrl: "/barter",
          metadata: {
            barterProposalId: proposal.id,
            targetListingId: proposal.targetListingId,
            offeredListingCount: proposal.offeredListings.length,
          },
        },
      ]);

      return proposal;
    });
  }

  async acceptProposal(recipientId: string, proposalId: string) {
    return prisma.$transaction(async (tx) => {
      const proposal = await tx.barterProposal.findUnique({
        where: { id: proposalId },
        include: { offeredListings: true },
      });

      assertMarketplace(proposal, "proposal_not_found", "Barter proposal was not found.", 404);
      assertMarketplace(proposal.recipientId === recipientId, "forbidden", "Only the recipient can accept this barter proposal.", 403);
      assertMarketplace(proposal.status === "proposed", "invalid_barter_state", "Only proposed barter offers can be accepted.", 409);
      assertMarketplace(Date.now() <= proposal.expiresAt.getTime(), "barter_expired", "This barter proposal has expired.", 409);

      const listingIds = [
        proposal.targetListingId,
        ...proposal.offeredListings.map((offeredListing) => offeredListing.listingId),
      ];

      await tx.listing.updateMany({
        where: { id: { in: listingIds }, status: "live" },
        data: { status: "barter_locked" },
      });

      const updatedProposal = await tx.barterProposal.update({
        where: { id: proposal.id },
        data: { status: "accepted", acceptedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          actorId: recipientId,
          action: "barter.proposal_accepted",
          entity: "BarterProposal",
          entityId: proposal.id,
          beforeState: { status: proposal.status },
          afterState: { status: updatedProposal.status, lockedListings: listingIds },
        },
      });

      await createMarketplaceNotifications(tx, [
        {
          userId: proposal.initiatorId,
          type: "barter",
          title: "Barter proposal accepted",
          body: "The recipient accepted your swap proposal. Involved listings are now locked.",
          actionUrl: "/barter",
          metadata: { barterProposalId: proposal.id, lockedListings: listingIds },
        },
      ]);

      return updatedProposal;
    });
  }
}
