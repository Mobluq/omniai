import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { canManageMarketplace } from "@/modules/identity/role-policy";
import { sanitizeUserText } from "@/lib/security/request-context";
import { hasMarketplacePii, redactMarketplacePii } from "@/lib/security/redaction";
import {
  evidenceFileState,
  isAllowedEvidenceContentType,
  mergeEvidenceFile,
  normalizeEvidenceRecord,
  type EvidenceCategory,
  type EvidenceContentType,
  type EvidenceFileRecord,
} from "@/modules/marketplace/evidence-policy";
import { assertMarketplace } from "@/modules/marketplace/errors";
import { MediaService } from "@/modules/marketplace/media-service";
import { createMarketplaceNotifications } from "@/modules/marketplace/notification-events";

export type ListEvidenceInput = {
  actorId: string;
};

export type RequestEvidenceUploadTicketInput = {
  actorId: string;
  disputeId: string;
  category: EvidenceCategory;
  contentType: EvidenceContentType;
  byteSize?: number;
  checksumSha256?: string;
};

export type AttachEvidenceInput = {
  actorId: string;
  disputeId: string;
  assetId: string;
  category: EvidenceCategory;
  note?: string;
};

const disputeInclude = {
  raisedBy: { select: { id: true, name: true, email: true } },
  resolvedBy: { select: { id: true, name: true, email: true } },
  order: {
    include: {
      listing: {
        include: {
          brand: true,
          category: true,
          photos: { orderBy: { sortOrder: "asc" as const }, take: 1 },
        },
      },
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true, sellerScore: true } },
      payments: { orderBy: { createdAt: "desc" as const } },
      shipments: { orderBy: { createdAt: "desc" as const } },
      disputes: { orderBy: { createdAt: "desc" as const } },
      reviews: { orderBy: { createdAt: "desc" as const } },
    },
  },
  barterProposal: {
    include: {
      initiator: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
      targetListing: {
        include: {
          brand: true,
          category: true,
          photos: { orderBy: { sortOrder: "asc" as const }, take: 1 },
          seller: { select: { id: true, name: true, sellerScore: true } },
        },
      },
      offeredListings: {
        include: {
          listing: {
            include: {
              brand: true,
              category: true,
              photos: { orderBy: { sortOrder: "asc" as const }, take: 1 },
              seller: { select: { id: true, name: true, sellerScore: true } },
            },
          },
          offeredBy: { select: { id: true, name: true, email: true } },
        },
      },
      payments: { orderBy: { createdAt: "desc" as const } },
      shipments: { orderBy: { createdAt: "desc" as const } },
      disputes: { orderBy: { createdAt: "desc" as const } },
    },
  },
} satisfies Prisma.DisputeInclude;

type EvidenceDispute = Prisma.DisputeGetPayload<{ include: typeof disputeInclude }>;

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function assertCanAccessDispute(actor: { id: string; role: UserRole }, dispute: EvidenceDispute) {
  const isParticipant =
    dispute.raisedById === actor.id ||
    dispute.order?.buyerId === actor.id ||
    dispute.order?.sellerId === actor.id ||
    dispute.barterProposal?.initiatorId === actor.id ||
    dispute.barterProposal?.recipientId === actor.id;

  assertMarketplace(
    canManageMarketplace(actor.role) || isParticipant,
    "forbidden",
    "You do not have access to this dispute evidence.",
    403,
  );
}

function participantRecipientIds(dispute: EvidenceDispute, actorId: string) {
  const ids = new Set<string>();
  ids.add(dispute.raisedById);
  if (dispute.order?.buyerId) ids.add(dispute.order.buyerId);
  if (dispute.order?.sellerId) ids.add(dispute.order.sellerId);
  if (dispute.barterProposal?.initiatorId) ids.add(dispute.barterProposal.initiatorId);
  if (dispute.barterProposal?.recipientId) ids.add(dispute.barterProposal.recipientId);
  ids.delete(actorId);
  return [...ids];
}

function sanitizedEvidenceNote(note?: string) {
  if (!note) return { note: null, redacted: false };

  const sanitized = sanitizeUserText(note).slice(0, 2000);
  return {
    note: redactMarketplacePii(sanitized),
    redacted: hasMarketplacePii(sanitized),
  };
}

function evidenceWhereForUser(actor: { id: string; role: UserRole }): Prisma.DisputeWhereInput {
  if (canManageMarketplace(actor.role)) return {};

  return {
    OR: [
      { raisedById: actor.id },
      { order: { is: { OR: [{ buyerId: actor.id }, { sellerId: actor.id }] } } },
      { barterProposal: { is: { OR: [{ initiatorId: actor.id }, { recipientId: actor.id }] } } },
    ],
  };
}

export class EvidenceService {
  private readonly mediaService = new MediaService();

  async listForUser(input: ListEvidenceInput) {
    const actor = await prisma.user.findUnique({
      where: { id: input.actorId },
      select: { id: true, role: true },
    });

    assertMarketplace(actor, "user_not_found", "User account was not found.", 404);

    return prisma.dispute.findMany({
      where: evidenceWhereForUser(actor),
      include: disputeInclude,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 100,
    });
  }

  async requestUploadTicket(input: RequestEvidenceUploadTicketInput) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: input.disputeId },
      include: disputeInclude,
    });
    const actor = await prisma.user.findUnique({
      where: { id: input.actorId },
      select: { id: true, role: true },
    });

    assertMarketplace(actor, "user_not_found", "User account was not found.", 404);
    assertMarketplace(dispute, "dispute_not_found", "Dispute was not found.", 404);
    assertCanAccessDispute(actor, dispute);

    const ticket = await this.mediaService.requestUploadTicket({
      ownerId: input.actorId,
      purpose: "evidence",
      contentType: input.contentType,
      byteSize: input.byteSize,
      checksumSha256: input.checksumSha256,
    });

    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: "evidence.upload_ticket_requested",
        entity: "Dispute",
        entityId: dispute.id,
        afterState: {
          disputeStatus: dispute.status,
          assetId: ticket.asset.id,
          category: input.category,
          contentType: input.contentType,
        },
      },
    });

    return ticket;
  }

  async attachEvidence(input: AttachEvidenceInput) {
    return prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({
        where: { id: input.actorId },
        select: { id: true, role: true },
      });
      const dispute = await tx.dispute.findUnique({
        where: { id: input.disputeId },
        include: disputeInclude,
      });
      const asset = await tx.mediaAsset.findUnique({ where: { id: input.assetId } });

      assertMarketplace(actor, "user_not_found", "User account was not found.", 404);
      assertMarketplace(dispute, "dispute_not_found", "Dispute was not found.", 404);
      assertMarketplace(asset, "media_asset_not_found", "Media asset was not found.", 404);
      assertCanAccessDispute(actor, dispute);
      assertMarketplace(
        asset.ownerId === input.actorId,
        "forbidden",
        "Only the uploader can attach this evidence.",
        403,
      );
      assertMarketplace(
        asset.status === "uploaded",
        "invalid_media_state",
        "Only uploaded evidence can be attached.",
        409,
      );
      assertMarketplace(
        isAllowedEvidenceContentType(asset.contentType),
        "unsupported_media_type",
        "Evidence files must be JPEG, PNG, WebP, or PDF.",
        415,
      );

      const now = new Date();
      const note = sanitizedEvidenceNote(input.note);
      const file: EvidenceFileRecord = {
        id: `${asset.id}-${now.getTime()}`,
        assetId: asset.id,
        url: asset.publicUrl,
        category: input.category,
        contentType: asset.contentType,
        byteSize: asset.byteSize,
        checksumSha256: asset.checksumSha256,
        uploadedById: input.actorId,
        note: note.note,
        redacted: note.redacted,
        attachedAt: now.toISOString(),
      };
      const beforeEvidence = normalizeEvidenceRecord(dispute.evidence);
      const afterEvidence = mergeEvidenceFile(beforeEvidence, file);
      const nextStatus = dispute.status === "awaiting_evidence" ? "under_review" : dispute.status;

      await tx.mediaAsset.update({
        where: { id: asset.id },
        data: {
          status: "attached",
          metadata: {
            ...metadataRecord(asset.metadata),
            purpose: "evidence",
            disputeId: dispute.id,
            evidenceCategory: input.category,
            attachedAt: now.toISOString(),
          },
        },
      });

      const updatedDispute = await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          evidence: afterEvidence as Prisma.InputJsonObject,
          status: nextStatus,
        },
        include: disputeInclude,
      });

      const admins = await tx.user.findMany({
        where: { role: { in: ["admin", "super_admin"] } },
        select: { id: true },
      });
      const participantIds = participantRecipientIds(dispute, input.actorId);
      const adminIds = canManageMarketplace(actor.role) ? [] : admins.map((admin) => admin.id);
      const recipientIds = [...new Set([...participantIds, ...adminIds])].filter(
        (id) => id !== input.actorId,
      );

      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "evidence.attached",
          entity: "Dispute",
          entityId: dispute.id,
          beforeState: {
            disputeStatus: dispute.status,
            evidence: evidenceFileState(beforeEvidence),
          },
          afterState: {
            disputeStatus: updatedDispute.status,
            evidence: evidenceFileState(afterEvidence),
            assetId: asset.id,
            category: input.category,
          },
        },
      });

      await createMarketplaceNotifications(
        tx,
        recipientIds.map((userId) => ({
          userId,
          type: "dispute",
          title: "Dispute evidence added",
          body: "A new evidence file was attached to a BD Select dispute.",
          actionUrl: "/evidence",
          metadata: { disputeId: dispute.id, assetId: asset.id, category: input.category },
        })),
      );

      return updatedDispute;
    });
  }
}
