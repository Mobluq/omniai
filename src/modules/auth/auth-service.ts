import { createHash, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { badRequest, conflict } from "@/lib/errors/app-error";
import { prisma } from "@/lib/db/prisma";
import {
  isTransactionalEmailConfigured,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from "@/lib/email/email-service";
import type { z } from "zod";
import type {
  emailVerificationConfirmSchema,
  emailVerificationRequestSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  signUpSchema,
} from "@/lib/validators/api-schemas";

export type SignUpInput = z.infer<typeof signUpSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type EmailVerificationRequestInput = z.infer<typeof emailVerificationRequestSchema>;
export type EmailVerificationConfirmInput = z.infer<typeof emailVerificationConfirmSchema>;

const passwordResetPrefix = "password-reset";
const emailVerificationPrefix = "email-verification";

function slugifyWorkspaceName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function passwordResetIdentifier(email: string) {
  return `${passwordResetPrefix}:${email}`;
}

function emailVerificationIdentifier(email: string) {
  return `${emailVerificationPrefix}:${email}`;
}

function getAppUrl() {
  return process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

export class AuthService {
  async signUp(input: SignUpInput) {
    const email = input.email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw conflict("An account already exists for this email.");
    }

    const passwordHash = await hash(input.password, 12);
    const baseSlug = slugifyWorkspaceName(`${input.name} workspace`);
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email,
          passwordHash,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: `${input.name}'s Workspace`,
          slug,
          type: "personal",
          members: {
            create: {
              userId: user.id,
              role: "owner",
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          action: "auth.signup",
          entityType: "user",
          entityId: user.id,
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          type: "system",
          title: "Welcome to OmniAI",
          body: "Your workspace is ready. Connect providers, create projects, and start routing AI work from chat.",
          actionUrl: "/settings",
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          type: "workspace",
          title: "Personal workspace created",
          body: `${workspace.name} is ready for conversations, projects, knowledge, and artifacts.`,
          actionUrl: "/dashboard",
        },
      });

      return { user, workspace };
    });

    const verification = await this.requestEmailVerification({
      email: result.user.email ?? email,
    });

    return { ...result, verification };
  }

  async requestEmailVerification(input: EmailVerificationRequestInput) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });
    const emailConfigured = isTransactionalEmailConfigured();

    if (!user?.email) {
      return { requested: true, alreadyVerified: false, verificationUrl: null, emailConfigured };
    }

    if (user.emailVerified) {
      return { requested: true, alreadyVerified: true, verificationUrl: null, emailConfigured };
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashResetToken(token);
    const expires = new Date(Date.now() + 24 * 60 * 60_000);
    const identifier = emailVerificationIdentifier(email);

    await prisma.verificationToken.deleteMany({
      where: { identifier },
    });
    await prisma.verificationToken.create({
      data: {
        identifier,
        token: tokenHash,
        expires,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "auth.email_verification_requested",
        entityType: "user",
        entityId: user.id,
      },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "security",
        title: "Email verification requested",
        body: "A verification link was requested for your OmniAI account email.",
        actionUrl: "/account",
      },
    });

    const verificationUrl = `${getAppUrl().replace(/\/$/, "")}/auth/verify-email?email=${encodeURIComponent(
      email,
    )}&token=${encodeURIComponent(token)}`;

    const delivery = await sendEmailVerificationEmail({
      to: user.email,
      verificationUrl,
    });

    return {
      requested: true,
      alreadyVerified: false,
      verificationUrl: process.env.NODE_ENV === "production" ? null : verificationUrl,
      emailConfigured,
      emailSent: delivery.sent,
    };
  }

  async confirmEmailVerification(input: EmailVerificationConfirmInput) {
    const email = input.email.toLowerCase().trim();
    const identifier = emailVerificationIdentifier(email);
    const tokenHash = hashResetToken(input.token);
    const token = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier,
          token: tokenHash,
        },
      },
    });

    if (!token || token.expires <= new Date()) {
      throw badRequest("The email verification link is invalid or expired.");
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw badRequest("The email verification link is invalid or expired.");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.deleteMany({
        where: { identifier },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "auth.email_verified",
          entityType: "user",
          entityId: user.id,
        },
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          type: "security",
          title: "Email verified",
          body: "Your OmniAI email address has been verified.",
          actionUrl: "/account",
        },
      }),
    ]);

    return { verified: true };
  }

  async requestPasswordReset(input: PasswordResetRequestInput) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user?.email) {
      return {
        requested: true,
        resetUrl: null,
        emailConfigured: isTransactionalEmailConfigured(),
      };
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashResetToken(token);
    const expires = new Date(Date.now() + 30 * 60_000);

    await prisma.verificationToken.deleteMany({
      where: { identifier: passwordResetIdentifier(email) },
    });
    await prisma.verificationToken.create({
      data: {
        identifier: passwordResetIdentifier(email),
        token: tokenHash,
        expires,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "auth.password_reset_requested",
        entityType: "user",
        entityId: user.id,
      },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "security",
        title: "Password reset requested",
        body: "A password reset was requested for your OmniAI account.",
        actionUrl: "/account",
      },
    });

    const resetUrl = `${getAppUrl().replace(/\/$/, "")}/auth/reset-password?email=${encodeURIComponent(
      email,
    )}&token=${encodeURIComponent(token)}`;

    const delivery = await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
    });

    return {
      requested: true,
      resetUrl: process.env.NODE_ENV === "production" ? null : resetUrl,
      emailConfigured: isTransactionalEmailConfigured(),
      emailSent: delivery.sent,
    };
  }

  async confirmPasswordReset(input: PasswordResetConfirmInput) {
    const email = input.email.toLowerCase().trim();
    const identifier = passwordResetIdentifier(email);
    const tokenHash = hashResetToken(input.token);
    const token = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier,
          token: tokenHash,
        },
      },
    });

    if (!token || token.expires <= new Date()) {
      throw badRequest("The password reset link is invalid or expired.");
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw badRequest("The password reset link is invalid or expired.");
    }

    const passwordHash = await hash(input.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.verificationToken.deleteMany({
        where: { identifier },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "auth.password_reset_completed",
          entityType: "user",
          entityId: user.id,
        },
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          type: "security",
          title: "Password reset completed",
          body: "Your OmniAI password was reset. Review security activity if this was not you.",
          actionUrl: "/account",
        },
      }),
    ]);

    return { reset: true };
  }
}
