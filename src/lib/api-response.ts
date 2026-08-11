import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError } from "@/lib/errors";

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  code: string;
  errors: unknown[];
}

export function apiSuccess<T>(data: T, message = "OK", status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, message, data }, { status });
}

export function apiError(
  message: string,
  code: string,
  status = 400,
  errors: unknown[] = []
) {
  return NextResponse.json<ApiError>({ success: false, message, code, errors }, { status });
}

/**
 * Central error-to-response mapping for route handlers. Never forwards a raw
 * error/stack trace to the client — unexpected errors are logged server-side and
 * returned as a generic 500 with a stable code the client can branch on.
 */
export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return apiError(error.message, error.code, error.status, error.errors);
  }

  if (error instanceof ZodError) {
    return apiError("Invalid input", "VALIDATION_ERROR", 422, error.issues);
  }

  console.error(error);
  return apiError("Something went wrong. Please try again.", "INTERNAL_ERROR", 500);
}
