export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export const badRequest = (message: string) => new AppError("BAD_REQUEST", message, 400);
export const unauthorized = (message = "You must be signed in to continue.") =>
  new AppError("UNAUTHORIZED", message, 401);
export const forbidden = (message = "You are not authorized to access this resource.") =>
  new AppError("FORBIDDEN", message, 403);
export const notFound = (message = "The requested resource was not found.") =>
  new AppError("NOT_FOUND", message, 404);
export const conflict = (message: string) => new AppError("CONFLICT", message, 409);
export const rateLimited = (message = "Too many requests. Please try again later.") =>
  new AppError("RATE_LIMITED", message, 429);
