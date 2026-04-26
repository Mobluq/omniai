import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger/logger";

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, { status });
}

export function errorResponse(code: string, message: string, status = 500) {
  return NextResponse.json<ApiFailure>({ success: false, error: { code, message } }, { status });
}

export function handleApiError(error: unknown, requestId?: string) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status);
  }

  if (error instanceof ZodError) {
    return errorResponse("VALIDATION_ERROR", "The request body is invalid.", 422);
  }

  logger.error("Unhandled API error", {
    requestId,
    error: error instanceof Error ? error.message : "Unknown error",
  });

  return errorResponse("INTERNAL_ERROR", "An unexpected error occurred.", 500);
}
