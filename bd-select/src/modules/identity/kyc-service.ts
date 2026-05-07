import { prisma } from "@/lib/db/prisma";
import { toSlug } from "@/lib/naming/slug";
import { hashSensitiveText, sanitizeUserText } from "@/lib/security/request-context";
import { assertMarketplace } from "@/modules/marketplace/errors";

export type SubmitKycInput = {
  userId: string;
  provider: "mono" | "dojah" | "manual";
  verificationType: "bvn" | "nin" | "passport";
  identityLast4: string;
  legalName: string;
  selfieChecked: boolean;
};

export type UpsertSellerProfileInput = {
  userId: string;
  storeName: string;
  bio?: string;
  payoutToken?: string;
  defaultHubCode?: string;
};

export class KycService {
  async submit(input: SubmitKycInput) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: input.userId } });
      assertMarketplace(user, "user_not_found", "User was not found.", 404);

      const status = process.env.NODE_ENV === "production" ? "pending" : "verified";
      const providerReference = `${input.provider}_${input.verificationType}_${input.userId}_${Date.now()}`;
      const identityToken = hashSensitiveText(
        [input.provider, input.verificationType, input.identityLast4, input.userId].join(":"),
      );

      const verification = await tx.kycVerification.create({
        data: {
          userId: input.userId,
          provider: input.provider,
          verificationType: input.verificationType,
          providerReference,
          identityToken,
          status,
          verifiedAt: status === "verified" ? new Date() : null,
          evidence: {
            legalName: sanitizeUserText(input.legalName),
            identityLast4: input.identityLast4,
            selfieChecked: input.selfieChecked,
            mode: process.env.NODE_ENV === "production" ? "provider_pending" : "local_auto_verified",
          },
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: input.userId },
        data: { kycStatus: status },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.userId,
          action: "kyc.submitted",
          entity: "KycVerification",
          entityId: verification.id,
          beforeState: { kycStatus: user.kycStatus },
          afterState: { kycStatus: updatedUser.kycStatus, provider: input.provider },
        },
      });

      return { verification, user: updatedUser };
    });
  }

  async upsertSellerProfile(input: UpsertSellerProfileInput) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: input.userId },
        include: { sellerProfile: true },
      });

      assertMarketplace(user, "user_not_found", "User was not found.", 404);
      assertMarketplace(user.kycStatus === "verified", "kyc_required", "Verified KYC is required before seller activation.", 403);

      const baseSlug = toSlug(input.storeName);
      let slug = baseSlug;
      let suffix = 2;

      while (
        await tx.sellerProfile.findFirst({
          where: {
            storeSlug: slug,
            userId: { not: input.userId },
          },
          select: { id: true },
        })
      ) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }

      const profile = await tx.sellerProfile.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          storeName: sanitizeUserText(input.storeName),
          storeSlug: slug,
          bio: input.bio ? sanitizeUserText(input.bio) : undefined,
          payoutToken: input.payoutToken,
          defaultHubCode: input.defaultHubCode,
        },
        update: {
          storeName: sanitizeUserText(input.storeName),
          storeSlug: slug,
          bio: input.bio ? sanitizeUserText(input.bio) : undefined,
          payoutToken: input.payoutToken,
          defaultHubCode: input.defaultHubCode,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: input.userId },
        data: { role: user.role === "buyer" ? "seller" : user.role },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.userId,
          action: "seller.profile_upserted",
          entity: "SellerProfile",
          entityId: profile.id,
          beforeState: { role: user.role, storeSlug: user.sellerProfile?.storeSlug },
          afterState: { role: updatedUser.role, storeSlug: profile.storeSlug },
        },
      });

      return { profile, user: updatedUser };
    });
  }
}
