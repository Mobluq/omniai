import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { ok } from "@/lib/errors/api-response";
import { marketplaceFailure } from "@/modules/marketplace/response";

export async function GET(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: currentUser.user.id },
      include: { sellerProfile: true },
    });

    return ok({ user });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
