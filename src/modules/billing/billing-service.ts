import { prisma } from "@/lib/db/prisma";
import { badRequest } from "@/lib/errors/app-error";
import { getStripeClient } from "@/lib/billing/stripe";

function getAppUrl() {
  return process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

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

  async createCheckoutSession(input: {
    workspaceId: string;
    userId: string;
    userEmail: string | null;
    planCode: "pro" | "team" | "enterprise";
  }) {
    const plan = await prisma.plan.findUnique({
      where: { code: input.planCode },
    });

    if (!plan) {
      throw badRequest("Selected plan was not found.");
    }

    if (plan.priceCents <= 0) {
      throw badRequest("This plan requires a sales-led setup.");
    }

    const stripe = getStripeClient();
    const existingSubscription = await this.getWorkspaceSubscription(input.workspaceId);
    const appUrl = getAppUrl().replace(/\/$/, "");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: existingSubscription?.stripeCustomerId ?? undefined,
      customer_email: existingSubscription?.stripeCustomerId ? undefined : input.userEmail ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: plan.currency,
            unit_amount: plan.priceCents,
            recurring: { interval: plan.interval },
            product_data: {
              name: `OmniAI ${plan.name}`,
              description: plan.description,
            },
          },
        },
      ],
      success_url: `${appUrl}/usage?billing=success`,
      cancel_url: `${appUrl}/usage?billing=cancelled`,
      metadata: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        planCode: plan.code,
      },
      subscription_data: {
        metadata: {
          workspaceId: input.workspaceId,
          planCode: plan.code,
        },
      },
    });

    await prisma.billingEvent.create({
      data: {
        eventType: "checkout.session.created",
        payload: {
          sessionId: session.id,
          workspaceId: input.workspaceId,
          planCode: plan.code,
        },
      },
    });

    return { url: session.url };
  }

  async createCustomerPortalSession(workspaceId: string) {
    const subscription = await this.getWorkspaceSubscription(workspaceId);

    if (!subscription?.stripeCustomerId) {
      throw badRequest("No Stripe customer is connected to this workspace yet.");
    }

    const stripe = getStripeClient();
    const appUrl = getAppUrl().replace(/\/$/, "");
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl}/usage`,
    });

    return { url: session.url };
  }
}
