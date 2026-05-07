import { ok } from "@/lib/errors/api-response";
import { fail } from "@/lib/errors/api-response";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { verifyPaystackSignature, WebhookService } from "@/modules/marketplace/webhook-service";

const webhookService = new WebhookService();

export async function POST(request: Request) {
  const rawBody = await request.text();
  const valid = verifyPaystackSignature(
    rawBody,
    request.headers.get("x-paystack-signature"),
    process.env.PAYSTACK_WEBHOOK_SECRET,
  );

  if (!valid) return fail("invalid_signature", "Invalid webhook signature.", 401);

  try {
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    return ok(await webhookService.recordPaymentSuccess("paystack", payload));
  } catch (error) {
    return marketplaceFailure(error);
  }
}
