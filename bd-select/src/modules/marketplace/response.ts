import { fail } from "@/lib/errors/api-response";
import { MarketplaceError } from "@/modules/marketplace/errors";

export function marketplaceFailure(error: unknown) {
  if (error instanceof MarketplaceError) {
    return fail(error.code, error.message, error.status);
  }

  console.error(error);
  return fail("internal_error", "Unexpected marketplace error.", 500);
}
