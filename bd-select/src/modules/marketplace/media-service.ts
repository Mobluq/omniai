import crypto from "node:crypto";
import type { PhotoRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { addHours } from "@/modules/marketplace/constants";
import {
  evidenceExtensionForContentType,
  isAllowedEvidenceContentType,
  MAX_EVIDENCE_FILE_BYTES,
} from "@/modules/marketplace/evidence-policy";
import { assertMarketplace } from "@/modules/marketplace/errors";
import {
  imageExtensionForContentType,
  isAllowedImageContentType,
  MAX_LISTING_IMAGE_BYTES,
  qualityScoreFromImageMetadata,
} from "@/modules/marketplace/media-policy";

export type RequestUploadTicketInput = {
  ownerId: string;
  role?: PhotoRole;
  purpose?: "listing" | "evidence";
  contentType: string;
  byteSize?: number;
  checksumSha256?: string;
};

export type CompleteUploadInput = {
  ownerId: string;
  assetId: string;
  publicUrl?: string;
  width?: number;
  height?: number;
  byteSize?: number;
  checksumSha256?: string;
};

function appUrl() {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function mediaProvider() {
  return process.env.CLOUDFLARE_R2_BUCKET ? "cloudflare-r2" : "local-dev";
}

function storageKey(ownerId: string, contentType: string, purpose: "listing" | "evidence") {
  const extension =
    purpose === "evidence"
      ? evidenceExtensionForContentType(contentType)
      : imageExtensionForContentType(contentType);
  const token = crypto.randomBytes(10).toString("hex");
  const directory = purpose === "evidence" ? "evidence" : "listing-media";
  return `users/${ownerId}/${directory}/${Date.now()}-${token}.${extension}`;
}

export class MediaService {
  async requestUploadTicket(input: RequestUploadTicketInput) {
    const purpose = input.purpose ?? "listing";
    assertMarketplace(
      purpose === "evidence"
        ? isAllowedEvidenceContentType(input.contentType)
        : isAllowedImageContentType(input.contentType),
      "unsupported_media_type",
      purpose === "evidence"
        ? "Evidence files must be JPEG, PNG, WebP, or PDF."
        : "Listing photos must be JPEG, PNG, or WebP images.",
      415,
    );
    assertMarketplace(
      !input.byteSize ||
        input.byteSize <=
          (purpose === "evidence" ? MAX_EVIDENCE_FILE_BYTES : MAX_LISTING_IMAGE_BYTES),
      "media_too_large",
      purpose === "evidence"
        ? "Evidence files must be 20MB or smaller."
        : "Listing photos must be 15MB or smaller.",
      413,
    );

    const owner = await prisma.user.findUnique({
      where: { id: input.ownerId },
      select: { id: true },
    });
    assertMarketplace(owner, "owner_not_found", "Media owner was not found.", 404);

    const key = storageKey(input.ownerId, input.contentType, purpose);
    const expiresAt = addHours(new Date(), 1);
    const provider = mediaProvider();
    const asset = await prisma.mediaAsset.create({
      data: {
        ownerId: input.ownerId,
        role: purpose === "listing" ? input.role : undefined,
        storageKey: key,
        uploadUrl:
          provider === "local-dev"
            ? `${appUrl()}/api/v1/media/assets/__assetId__/complete`
            : `r2://${process.env.CLOUDFLARE_R2_BUCKET}/${key}`,
        publicUrl: `${appUrl()}/api/v1/media/assets/__assetId__/preview`,
        contentType: input.contentType,
        byteSize: input.byteSize,
        checksumSha256: input.checksumSha256,
        expiresAt,
        metadata: { provider, purpose },
      },
    });

    const uploadUrl = asset.uploadUrl?.replace("__assetId__", asset.id);
    const publicUrl = asset.publicUrl.replace("__assetId__", asset.id);

    const updatedAsset = await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { uploadUrl, publicUrl },
    });

    await prisma.auditLog.create({
      data: {
        actorId: input.ownerId,
        action: "media.upload_ticket_created",
        entity: "MediaAsset",
        entityId: updatedAsset.id,
        afterState: { status: updatedAsset.status, role: updatedAsset.role, purpose },
        metadata: { provider, purpose },
      },
    });

    return {
      asset: updatedAsset,
      upload: {
        method: provider === "local-dev" ? "POST" : "PUT",
        url: updatedAsset.uploadUrl,
        expiresAt,
        provider,
      },
    };
  }

  async completeUpload(input: CompleteUploadInput) {
    return prisma.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.findUnique({ where: { id: input.assetId } });

      assertMarketplace(asset, "media_asset_not_found", "Media asset was not found.", 404);
      assertMarketplace(
        asset.ownerId === input.ownerId,
        "forbidden",
        "Only the owner can complete this media upload.",
        403,
      );
      assertMarketplace(
        asset.status === "ticketed",
        "invalid_media_state",
        "Only ticketed media can be completed.",
        409,
      );
      assertMarketplace(
        !asset.expiresAt || asset.expiresAt.getTime() > Date.now(),
        "media_ticket_expired",
        "Upload ticket has expired.",
        409,
      );

      const qualityScore = asset.contentType.startsWith("image/")
        ? qualityScoreFromImageMetadata({
            width: input.width,
            height: input.height,
            byteSize: input.byteSize ?? asset.byteSize ?? undefined,
            role: asset.role ?? undefined,
          })
        : null;

      const updatedAsset = await tx.mediaAsset.update({
        where: { id: asset.id },
        data: {
          status: "uploaded",
          publicUrl: input.publicUrl ?? asset.publicUrl,
          width: input.width,
          height: input.height,
          byteSize: input.byteSize ?? asset.byteSize,
          checksumSha256: input.checksumSha256 ?? asset.checksumSha256,
          qualityScore,
          uploadedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.ownerId,
          action: "media.upload_completed",
          entity: "MediaAsset",
          entityId: asset.id,
          beforeState: { status: asset.status },
          afterState: { status: updatedAsset.status, qualityScore },
        },
      });

      return updatedAsset;
    });
  }

  async getAssetForPreview(assetId: string) {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
    assertMarketplace(asset, "media_asset_not_found", "Media asset was not found.", 404);
    return asset;
  }
}
