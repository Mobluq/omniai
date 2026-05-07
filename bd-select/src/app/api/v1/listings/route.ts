import { requireCurrentUser } from "@/lib/auth/current-user";
import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { CatalogService } from "@/modules/marketplace/catalog-service";
import { marketplaceFailure } from "@/modules/marketplace/response";
import { createListingSchema } from "@/modules/marketplace/schemas";

const catalogService = new CatalogService();

export async function POST(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  const body = await parseJsonBody(request, createListingSchema);
  if (!body.ok) return body.response;

  try {
    const listing = await catalogService.createListing({
      sellerId: currentUser.user.id,
      ...body.data,
    });

    return ok({ listing }, { status: 201 });
  } catch (error) {
    return marketplaceFailure(error);
  }
}

export async function GET(request: Request) {
  const currentUser = await requireCurrentUser(request);
  if (!currentUser.ok) return currentUser.response;

  try {
    return ok({ listings: await catalogService.listSellerListings(currentUser.user.id) });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
