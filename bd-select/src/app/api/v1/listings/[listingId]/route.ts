import { ok } from "@/lib/errors/api-response";
import { CatalogService } from "@/modules/marketplace/catalog-service";
import { marketplaceFailure } from "@/modules/marketplace/response";

const catalogService = new CatalogService();

type ListingRouteContext = {
  params: Promise<{ listingId: string }>;
};

export async function GET(_request: Request, context: ListingRouteContext) {
  const { listingId } = await context.params;

  try {
    return ok({ listing: await catalogService.getPublicListing(listingId) });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
