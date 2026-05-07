import { ok } from "@/lib/errors/api-response";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { WebhookService } from "@/modules/marketplace/webhook-service";

const webhookService = new WebhookService();

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    return ok(await webhookService.recordShipmentEvent("gig", payload));
  } catch (error) {
    return marketplaceFailure(error);
  }
}
