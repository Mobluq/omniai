import { ok } from "@/lib/errors/api-response";
import { CatalogService } from "@/modules/marketplace/catalog-service";
import { marketplaceFailure } from "@/modules/marketplace/response";

const catalogService = new CatalogService();

function numberParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const listings = await catalogService.searchListings({
      query: url.searchParams.get("q") ?? undefined,
      brandId: url.searchParams.get("brandId") ?? undefined,
      categoryId: url.searchParams.get("categoryId") ?? undefined,
      minPriceNgn: numberParam(url.searchParams.get("minPriceNgn")),
      maxPriceNgn: numberParam(url.searchParams.get("maxPriceNgn")),
    });

    return ok({ listings });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
