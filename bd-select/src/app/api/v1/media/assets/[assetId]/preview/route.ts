import { marketplaceFailure } from "@/modules/marketplace/response";
import { MediaService } from "@/modules/marketplace/media-service";

const mediaService = new MediaService();

type MediaRouteContext = {
  params: Promise<{ assetId: string }>;
};

export async function GET(_request: Request, context: MediaRouteContext) {
  const { assetId } = await context.params;

  try {
    const asset = await mediaService.getAssetForPreview(assetId);
    const label = `${asset.role ?? "BD Select"} ${asset.status}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="${label}"><rect width="1200" height="900" fill="#f4f1e8"/><rect x="54" y="54" width="1092" height="792" fill="none" stroke="#214f3d" stroke-width="18"/><text x="90" y="170" fill="#214f3d" font-family="Arial, sans-serif" font-size="58" font-weight="700">BD Select</text><text x="90" y="250" fill="#66756d" font-family="Arial, sans-serif" font-size="34">${label}</text><text x="90" y="790" fill="#214f3d" font-family="Arial, sans-serif" font-size="30">${asset.storageKey}</text></svg>`;

    return new Response(svg, {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
