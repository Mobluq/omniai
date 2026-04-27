import "server-only";
import { PrismaClient } from "@prisma/client";
import { getServerEnv } from "@/lib/env/server";

if (process.env.NODE_ENV === "production") {
  getServerEnv();
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
