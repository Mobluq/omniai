import { prisma } from "@/lib/db/prisma";

export class BillingService {
  async listPlans() {
    return prisma.plan.findMany({
      include: { usageLimits: true },
      orderBy: { priceCents: "asc" },
    });
  }

  async getWorkspaceSubscription(workspaceId: string) {
    return prisma.subscription.findFirst({
      where: { workspaceId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
