import { ok } from "@/lib/errors/api-response";
import { fail } from "@/lib/errors/api-response";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { verifyFlutterwaveSignature, WebhookService } from "@/modules/marketplace/webhook-service";

const webhookService = new WebhookService();

export async function POST(request: Request) {
  const valid = verifyFlutterwaveSignature(
    request.headers.get("verif-hash"),
    process.env.FLUTTERWAVE_WEBHOOK_SECRET,
  );

  if (!valid) return fail("invalid_signature", "Invalid webhook signature.", 401);

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    return ok(await webhookService.recordPaymentSuccess("flutterwave", payload));
  } catch (error) {
    return marketplaceFailure(error);
  }
}
