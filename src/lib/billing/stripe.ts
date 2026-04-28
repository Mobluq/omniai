import "server-only";
import Stripe from "stripe";
import { badRequest } from "@/lib/errors/app-error";

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw badRequest("Stripe is not configured for this environment.");
  }

  return new Stripe(secretKey);
}
