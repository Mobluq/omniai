import { prisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/security/encryption";

export type RateLimitInput = {
  key: string;
  scope?: string;
  limit: number;
  windowSeconds: number;
};

export async function assertRateLimit({
  key,
  scope = "global",
  limit,
  windowSeconds,
}: RateLimitInput) {
  const hashedKey = sha256(key);
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);

  const result = await prisma.$transaction(async (tx) => {
    const bucket = await tx.rateLimitBucket.findUnique({ where: { keyHash: hashedKey } });

    if (!bucket || bucket.resetAt <= now) {
      return tx.rateLimitBucket.upsert({
        where: { keyHash: hashedKey },
        create: { keyHash: hashedKey, scope, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
    }

    if (bucket.count >= limit) {
      return bucket;
    }

    return tx.rateLimitBucket.update({
      where: { keyHash: hashedKey },
      data: { count: { increment: 1 } },
    });
  });

  if (result.count > limit) {
    throw new Error("Rate limit exceeded.");
  }
}
