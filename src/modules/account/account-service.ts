import type { RoutingMode } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { forbidden, badRequest } from "@/lib/errors/app-error";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";
import {
  createTotpUri,
  generateRecoveryCodes,
  generateTotpSecret,
  verifyTotpToken,
} from "@/lib/security/totp";

export type UpdateProfileInput = {
  name?: string;
  jobTitle?: string | null;
  companyName?: string | null;
  timezone?: string;
  locale?: string;
  defaultRoutingMode?: RoutingMode;
  defaultModelId?: string;
  memoryEnabled?: boolean;
  dataRetentionDays?: number;
};

export type UpdateNotificationPreferencesInput = {
  emailProductUpdates?: boolean;
  emailUsageAlerts?: boolean;
  emailSecurityAlerts?: boolean;
  emailWeeklyDigest?: boolean;
  providerIncidentAlerts?: boolean;
  billingAlerts?: boolean;
};

export class AccountService {
  async getProfile(userId: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        jobTitle: true,
        companyName: true,
        timezone: true,
        locale: true,
        defaultRoutingMode: true,
        defaultModelId: true,
        memoryEnabled: true,
        dataRetentionDays: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        jobTitle: input.jobTitle,
        companyName: input.companyName,
        timezone: input.timezone,
        locale: input.locale,
        defaultRoutingMode: input.defaultRoutingMode,
        defaultModelId: input.defaultModelId,
        memoryEnabled: input.memoryEnabled,
        dataRetentionDays: input.dataRetentionDays,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        jobTitle: true,
        companyName: true,
        timezone: true,
        locale: true,
        defaultRoutingMode: true,
        defaultModelId: true,
        memoryEnabled: true,
        dataRetentionDays: true,
        createdAt: true,
      },
    });
  }

  async getNotificationPreferences(userId: string) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async updateNotificationPreferences(
    userId: string,
    input: UpdateNotificationPreferencesInput,
  ) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      update: input,
      create: {
        userId,
        ...input,
      },
    });
  }

  async getSecurityOverview(userId: string) {
    const [user, activeSessions, recentSecurityEvents] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          twoFactorEnabled: true,
          twoFactorConfirmedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.session.count({ where: { userId, expires: { gt: new Date() } } }),
      prisma.auditLog.findMany({
        where: {
          userId,
          action: {
            in: [
              "auth.login_failed",
              "auth.login_succeeded",
              "auth.2fa_setup_started",
              "auth.2fa_enabled",
              "auth.2fa_disabled",
              "auth.password_changed",
            ],
          },
        },
        select: {
          id: true,
          action: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          metadata: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return {
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorConfirmedAt: user.twoFactorConfirmedAt,
      activeSessions,
      recentSecurityEvents,
    };
  }

  async startTwoFactorSetup(userId: string) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, twoFactorEnabled: true },
    });

    if (!user.email) {
      throw badRequest("An email address is required before enabling two-factor authentication.");
    }

    const secret = generateTotpSecret();
    const otpauthUri = createTotpUri({ email: user.email, secret });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecretEncrypted: encryptSecret(secret),
          twoFactorConfirmedAt: null,
          twoFactorRecoveryCodesEncrypted: null,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: "auth.2fa_setup_started",
          entityType: "user",
          entityId: userId,
        },
      }),
      prisma.notification.create({
        data: {
          userId,
          type: "security",
          title: "2FA setup started",
          body: "Finish setup by entering the six-digit code from your authenticator app.",
          actionUrl: "/account",
        },
      }),
    ]);

    return {
      secret,
      otpauthUri,
      alreadyEnabled: user.twoFactorEnabled,
    };
  }

  async verifyTwoFactorSetup(userId: string, token: string) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { twoFactorSecretEncrypted: true },
    });

    if (!user.twoFactorSecretEncrypted) {
      throw badRequest("Start two-factor setup before verifying a code.");
    }

    const secret = decryptSecret(user.twoFactorSecretEncrypted);

    if (!verifyTotpToken({ secret, token })) {
      throw forbidden("The authenticator code is not valid.");
    }

    const recoveryCodes = generateRecoveryCodes();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorConfirmedAt: new Date(),
          twoFactorRecoveryCodesEncrypted: encryptSecret(JSON.stringify(recoveryCodes)),
        },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: "auth.2fa_enabled",
          entityType: "user",
          entityId: userId,
        },
      }),
      prisma.notification.create({
        data: {
          userId,
          type: "security",
          title: "Two-factor authentication enabled",
          body: "Your account now requires an authenticator or recovery code after password sign-in.",
          actionUrl: "/account",
        },
      }),
    ]);

    return { recoveryCodes };
  }

  async disableTwoFactor(userId: string, token: string) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorSecretEncrypted: true },
    });

    if (!user.twoFactorEnabled) {
      return { disabled: true };
    }

    if (!user.twoFactorSecretEncrypted) {
      throw badRequest("Two-factor authentication is not configured correctly.");
    }

    const secret = decryptSecret(user.twoFactorSecretEncrypted);

    if (!verifyTotpToken({ secret, token })) {
      throw forbidden("The authenticator code is not valid.");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecretEncrypted: null,
          twoFactorConfirmedAt: null,
          twoFactorRecoveryCodesEncrypted: null,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: "auth.2fa_disabled",
          entityType: "user",
          entityId: userId,
        },
      }),
      prisma.notification.create({
        data: {
          userId,
          type: "security",
          title: "Two-factor authentication disabled",
          body: "2FA was disabled for your account. Re-enable it if this was not intended.",
          actionUrl: "/account",
        },
      }),
    ]);

    return { disabled: true };
  }

  async changePassword(userId: string, input: { currentPassword: string; newPassword: string }) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user.passwordHash) {
      throw badRequest("Password sign-in is not configured for this account.");
    }

    const currentPasswordValid = await compare(input.currentPassword, user.passwordHash);

    if (!currentPasswordValid) {
      throw forbidden("The current password is not valid.");
    }

    const passwordHash = await hash(input.newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: "auth.password_changed",
          entityType: "user",
          entityId: userId,
        },
      }),
      prisma.notification.create({
        data: {
          userId,
          type: "security",
          title: "Password changed",
          body: "Your OmniAI password was updated. Review security activity if this was not you.",
          actionUrl: "/account",
        },
      }),
    ]);

    return { changed: true };
  }
}
