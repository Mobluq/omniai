import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import { getServerEnv } from "@/lib/env/server";
import { assertRateLimit, resetRateLimit } from "@/lib/security/rate-limit";
import { hashSensitiveText } from "@/lib/security/request-context";

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
      },
      async authorize(credentials, request) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
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
};
