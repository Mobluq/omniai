import type { OtpPurpose } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sanitizeUserText } from "@/lib/security/request-context";
import { assertMarketplace } from "@/modules/marketplace/errors";
import {
  classifyIdentifier,
  DEV_OTP_CODE,
  generateOtpCode,
  hashOtpCode,
  isValidIdentityIdentifier,
  normalizeIdentityIdentifier,
  otpExpiresAt,
} from "@/modules/identity/otp-policy";

export type RequestOtpInput = {
  identifier: string;
  purpose: OtpPurpose;
};

export type VerifyOtpInput = {
  identifier: string;
  purpose: OtpPurpose;
  code: string;
  name?: string;
};

function otpSecret() {
  return process.env.NEXTAUTH_SECRET || "bd-select-local-otp-secret";
}

export class OtpService {
  async requestOtp(input: RequestOtpInput) {
    const identifier = normalizeIdentityIdentifier(input.identifier);
    assertMarketplace(
      isValidIdentityIdentifier(identifier),
      "invalid_identifier",
      "Use a valid email address or Nigerian phone number.",
      422,
    );

    const kind = classifyIdentifier(identifier);
    const existingUser = await prisma.user.findFirst({
      where: kind === "email" ? { email: identifier } : { phone: identifier },
      select: { id: true },
    });

    const code = process.env.NODE_ENV === "production" ? generateOtpCode() : DEV_OTP_CODE;
    const challenge = await prisma.otpChallenge.create({
      data: {
        userId: existingUser?.id,
        identifier,
        purpose: input.purpose,
        codeHash: hashOtpCode(identifier, input.purpose, code, otpSecret()),
        expiresAt: otpExpiresAt(),
      },
      select: { id: true, identifier: true, purpose: true, expiresAt: true },
    });

    await prisma.auditLog.create({
      data: {
        actorId: existingUser?.id,
        action: "auth.otp_requested",
        entity: "OtpChallenge",
        entityId: challenge.id,
        metadata: { identifierKind: kind, purpose: input.purpose },
      },
    });

    return {
      challenge,
      delivery: {
        channel: kind,
        maskedIdentifier: kind === "email" ? identifier.replace(/(.{2}).+(@.+)/, "$1***$2") : `${identifier.slice(0, 3)}*****${identifier.slice(-3)}`,
        devCode: process.env.NODE_ENV === "production" ? undefined : code,
      },
    };
  }

  async verifyOtp(input: VerifyOtpInput) {
    const identifier = normalizeIdentityIdentifier(input.identifier);
    const challenge = await prisma.otpChallenge.findFirst({
      where: {
        identifier,
        purpose: input.purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    assertMarketplace(challenge, "otp_not_found", "OTP challenge was not found or has expired.", 404);
    assertMarketplace(challenge.attempts < challenge.maxAttempts, "otp_locked", "OTP attempts are exhausted.", 429);

    const valid = challenge.codeHash === hashOtpCode(identifier, input.purpose, input.code, otpSecret());
    if (!valid) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      assertMarketplace(false, "otp_invalid", "OTP code is invalid.", 401);
    }

    const kind = classifyIdentifier(identifier);
    const now = new Date();
    const user = await prisma.user.upsert({
      where: kind === "email" ? { email: identifier } : { phone: identifier },
      create: {
        email: kind === "email" ? identifier : undefined,
        phone: kind === "phone" ? identifier : undefined,
        name: input.name ? sanitizeUserText(input.name) : undefined,
        emailVerified: kind === "email" ? now : undefined,
        phoneVerifiedAt: kind === "phone" ? now : undefined,
      },
      update: {
        name: input.name ? sanitizeUserText(input.name) : undefined,
        emailVerified: kind === "email" ? now : undefined,
        phoneVerifiedAt: kind === "phone" ? now : undefined,
        lastLoginAt: now,
      },
    });

    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: now, userId: user.id },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "auth.otp_verified",
        entity: "User",
        entityId: user.id,
        metadata: { identifierKind: kind, purpose: input.purpose },
      },
    });

    return {
      user,
      development: {
        trustedAuthHeader: process.env.NODE_ENV === "production" ? undefined : "x-bd-select-user-id",
        trustedAuthHeaderUserId: process.env.NODE_ENV === "production" ? undefined : user.id,
      },
    };
  }
}
