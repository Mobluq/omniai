export class MarketplaceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "MarketplaceError";
  }
}

export function assertMarketplace(
  condition: unknown,
  code: string,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) {
    throw new MarketplaceError(code, message, status);
  }
}
