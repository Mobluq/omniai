import { providerError } from "@/lib/errors/app-error";

type ProviderErrorPayload = {
  error?: {
    message?: unknown;
    code?: unknown;
    type?: unknown;
  };
  message?: unknown;
};

export async function throwProviderResponseError(providerName: string, response: Response): Promise<never> {
  const raw = await response.text().catch(() => "");
  let providerMessage = "";

  if (raw) {
    try {
      const payload = JSON.parse(raw) as ProviderErrorPayload;
      const message = payload.error?.message ?? payload.message;
      providerMessage = typeof message === "string" ? message : "";
    } catch {
      providerMessage = raw.slice(0, 240);
    }
  }

  const detail = providerMessage ? ` ${providerMessage}` : "";
  throw providerError(`${providerName} rejected the request (${response.status}).${detail}`);
}

export function isLikelyModelAccessError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("model") &&
    (message.includes("not found") ||
      message.includes("does not exist") ||
      message.includes("not have access") ||
      message.includes("unsupported"))
  );
}
