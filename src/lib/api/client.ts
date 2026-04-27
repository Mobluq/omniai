export type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export class ClientApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "REQUEST_FAILED", status = 500) {
    super(message);
    this.name = "ClientApiError";
    this.code = code;
    this.status = status;
  }
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  let envelope: ApiEnvelope<T>;

  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ClientApiError("The server returned an unreadable response.", "BAD_RESPONSE", response.status);
  }

  if (!envelope.success) {
    throw new ClientApiError(envelope.error.message, envelope.error.code, response.status);
  }

  return envelope.data;
}
