import { prisma } from "@/lib/db/prisma";
import { ok } from "@/lib/errors/api-response";
import { fail } from "@/lib/errors/api-response";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return fail("not_found", "Not found.", 404);
  }

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [
          "buyer@bdselect.local",
          "seller@bdselect.local",
          "trader@bdselect.local",
          "authenticator@bdselect.local",
          "admin@bdselect.local",
        ],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      kycStatus: true,
      sellerScore: true,
    },
    orderBy: { role: "asc" },
  });

  return ok({ users });
}
