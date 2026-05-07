import { ok } from "@/lib/errors/api-response";
import { CatalogService } from "@/modules/marketplace/catalog-service";
import { marketplaceFailure } from "@/modules/marketplace/response";

const catalogService = new CatalogService();

export async function GET() {
  try {
    return ok(await catalogService.taxonomy());
  } catch (error) {
    return marketplaceFailure(error);
  }
}
