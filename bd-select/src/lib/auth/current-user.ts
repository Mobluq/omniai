import { prisma } from "@/lib/db/prisma";
import { fail } from "@/lib/errors/api-response";

export async function requireCurrentUser(request: Request) {
  const userId = request.headers.get("x-bd-select-user-id");

  if (!userId) {
    return {
      ok: false as const,
      response: fail("unauthorized", "Authentication is required.", 401),
    };
  }

  if (process.env.NODE_ENV === "production" && process.env.ALLOW_TRUSTED_AUTH_HEADERS !== "true") {
    return {
      ok: false as const,
      response: fail("auth_not_configured", "Production auth adapter is not configured.", 501),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, kycStatus: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    return {
      ok: false as const,
      response: fail("unauthorized", "Authentication is required.", 401),
    };
  }

  return { ok: true as const, user };
}
