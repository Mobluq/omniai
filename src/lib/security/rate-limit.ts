import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { rateLimited } from "@/lib/errors/app-error";

export type RateLimitOptions = {
  scope: string;
  key: string;
  limit: number;
  windowMs: number;
  blockDurationMs?: number;
};

function hashRateLimitKey(scope: string, key: string) {
  return createHash("sha256").update(`${scope}:${key}`).digest("hex");
}

function isRetryableTransactionError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

async function recordAttempt({
  scope,
  key,
  limit,
  windowMs,
  blockDurationMs = windowMs,
}: RateLimitOptions) {
  await prisma.$transaction(
    async (tx) => {
      const now = new Date();
      const resetAt = new Date(now.getTime() + windowMs);
      const keyHash = hashRateLimitKey(scope, key);
      const bucket = await tx.rateLimitBucket.findUnique({ where: { keyHash } });

      if (bucket?.blockedUntil && bucket.blockedUntil > now) {
        throw rateLimited();
      }

      if (!bucket || bucket.resetAt <= now) {
        await tx.rateLimitBucket.upsert({
          where: { keyHash },
          update: {
            scope,
            count: 1,
            resetAt,
            blockedUntil: null,
          },
          create: {
            keyHash,
            scope,
            count: 1,
            resetAt,
          },
        });
        return;
      }

      const nextCount = bucket.count + 1;

      if (nextCount > limit) {
        await tx.rateLimitBucket.update({
          where: { keyHash },
          data: {
            count: nextCount,
            blockedUntil: new Date(now.getTime() + blockDurationMs),
          },
        });
        throw rateLimited();
      }

      await tx.rateLimitBucket.update({
        where: { keyHash },
        data: { count: nextCount },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function assertRateLimit(options: RateLimitOptions) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await recordAttempt(options);
      return;
    } catch (error) {
      if (attempt < 3 && isRetryableTransactionError(error)) {
        continue;
      }

      throw error;
    }
  }
}

export async function resetRateLimit(scope: string, key: string) {
  const keyHash = hashRateLimitKey(scope, key);
  await prisma.rateLimitBucket.deleteMany({ where: { keyHash } });
}
