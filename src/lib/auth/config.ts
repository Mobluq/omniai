import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import { timingSafeEqual } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import type { Provider } from "next-auth/providers/index";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db/prisma";
import { getServerEnv } from "@/lib/env/server";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";
import { assertRateLimit, resetRateLimit } from "@/lib/security/rate-limit";
import { hashSensitiveText } from "@/lib/security/request-context";
import { verifyTotpToken } from "@/lib/security/totp";
import { getEnabledOAuthProviders } from "@/modules/auth/oauth-providers";

if (process.env.NODE_ENV === "production") {
  getServerEnv();
}

function getAuthHeader(headers: unknown, name: string) {
  if (!headers) {
    return null;
  }

  if (typeof (headers as { get?: unknown }).get === "function") {
    return (headers as Headers).get(name);
  }

  const record = headers as Record<string, string | string[] | undefined>;
  const value = record[name] ?? record[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value ?? null;
}

function getAuthIp(headers: unknown) {
  return (
    getAuthHeader(headers, "x-forwarded-for")?.split(",")[0]?.trim() ??
    getAuthHeader(headers, "x-real-ip") ??
    "unknown"
  );
}

async function recordLoginAudit(input: {
  action: "auth.login_failed" | "auth.login_succeeded";
  email: string;
  userId?: string;
  reason?: string;
  ipAddress: string;
  userAgent: string;
}) {
  await prisma.auditLog
    .create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: "auth",
        entityId: input.userId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: {
          emailHash: hashSensitiveText(input.email),
          reason: input.reason,
        },
      },
    })
    .catch(() => undefined);
}

function slugifyWorkspaceName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

async function ensurePersonalWorkspace(user: { id?: string; name?: string | null; email?: string | null }) {
  if (!user.id) {
    return;
  }

  const existingMembership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  if (existingMembership) {
    return;
  }

  const workspaceName = `${user.name ?? user.email ?? "OmniAI"}'s Workspace`;
  const baseSlug = slugifyWorkspaceName(workspaceName) || "workspace";

  const workspace = await prisma.workspace.create({
    data: {
      name: workspaceName,
      slug: `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`,
      type: "personal",
      members: {
        create: {
          userId: user.id,
          role: "owner",
        },
      },
    },
  });

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      workspaceId: workspace.id,
      type: "workspace",
      title: "Personal workspace created",
      body: `${workspace.name} is ready for conversations, projects, knowledge, and artifacts.`,
      actionUrl: "/dashboard",
    },
  });
}

const oauthProviders: Provider[] = [];

for (const provider of getEnabledOAuthProviders()) {
  if (provider.id === "google") {
    oauthProviders.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      }),
    );
  }

  if (provider.id === "github") {
    oauthProviders.push(
      GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      }),
    );
  }
}

function normalizeRecoveryCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z2-7]/g, "");
}

function safeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function consumeRecoveryCode(userId: string, encryptedCodes: string, submittedCode: string) {
  let recoveryCodes: string[];

  try {
    recoveryCodes = JSON.parse(decryptSecret(encryptedCodes)) as string[];
  } catch {
    return false;
  }

  const normalizedSubmittedCode = normalizeRecoveryCode(submittedCode);
  const index = recoveryCodes.findIndex((code) =>
    safeStringEqual(normalizeRecoveryCode(code), normalizedSubmittedCode),
  );

  if (index === -1) {
    return false;
  }

  const remainingCodes = recoveryCodes.filter((_, currentIndex) => currentIndex !== index);
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorRecoveryCodesEncrypted: encryptSecret(JSON.stringify(remainingCodes)),
    },
  });

  return true;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/sign-in",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        oneTimeCode: { label: "Authenticator code", type: "text" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        const oneTimeCode = credentials?.oneTimeCode?.trim();
        const headers = request?.headers;
        const ipAddress = getAuthIp(headers);
        const userAgent = getAuthHeader(headers, "user-agent") ?? "unknown";
        const throttleKey = `${email ?? "missing"}:${ipAddress}`;

        try {
          await assertRateLimit({
            scope: "auth.login",
            key: throttleKey,
            limit: 5,
            windowMs: 15 * 60_000,
            blockDurationMs: 30 * 60_000,
          });
        } catch {
          return null;
        }

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user?.passwordHash) {
          await recordLoginAudit({
            action: "auth.login_failed",
            email,
            reason: "unknown_user",
            ipAddress,
            userAgent,
          });
          return null;
        }

        const isValid = await compare(password, user.passwordHash);

        if (!isValid) {
          await recordLoginAudit({
            action: "auth.login_failed",
            email,
            userId: user.id,
            reason: "invalid_password",
            ipAddress,
            userAgent,
          });
          return null;
        }

        if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.emailVerified) {
          await recordLoginAudit({
            action: "auth.login_failed",
            email,
            userId: user.id,
            reason: "email_unverified",
            ipAddress,
            userAgent,
          });
          return null;
        }

        if (user.twoFactorEnabled) {
          const isTotpValid =
            Boolean(user.twoFactorSecretEncrypted && oneTimeCode) &&
            verifyTotpToken({
              secret: decryptSecret(user.twoFactorSecretEncrypted!),
              token: oneTimeCode!,
            });
          const isRecoveryCodeValid =
            !isTotpValid && user.twoFactorRecoveryCodesEncrypted && oneTimeCode
              ? await consumeRecoveryCode(user.id, user.twoFactorRecoveryCodesEncrypted, oneTimeCode)
              : false;

          if (!isTotpValid && !isRecoveryCodeValid) {
            await recordLoginAudit({
              action: "auth.login_failed",
              email,
              userId: user.id,
              reason: "invalid_totp",
              ipAddress,
              userAgent,
            });
            return null;
          }
        }

        await resetRateLimit("auth.login", throttleKey);
        await recordLoginAudit({
          action: "auth.login_succeeded",
          email,
          userId: user.id,
          ipAddress,
          userAgent,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    ...oauthProviders,
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
  events: {
    async createUser({ user }) {
      await ensurePersonalWorkspace(user);
    },
  },
};
