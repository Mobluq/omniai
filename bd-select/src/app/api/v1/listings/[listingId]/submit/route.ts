import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { CatalogService } from "@/modules/marketplace/catalog-service";
import { marketplaceFailure } from "@/modules/marketplace/response";

const catalogService = new CatalogService();

type ListingRouteContext = {
  params: Promise<{ listingId: string }>;
};

export async function POST(request: Request, context: ListingRouteContext) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const { listingId } = await context.params;

  try {
    return ok(await catalogService.submitListing(currentUser.user.id, listingId));
  } catch (error) {
    return marketplaceFailure(error);
  }
}
