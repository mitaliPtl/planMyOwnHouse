/**
 * Typed application error. Route handlers catch this (see api-response.ts) and map it
 * to the standard `{ success, message, code, errors }` shape — callers never need to
 * guess an HTTP status or invent a code string ad hoc.
 */
export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly errors: unknown[];

  constructor(code: string, message: string, status = 400, errors: unknown[] = []) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.errors = errors;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super("FORBIDDEN", message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super("NOT_FOUND", message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid input", errors: unknown[] = []) {
    super("VALIDATION_ERROR", message, 422, errors);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = "Too many requests, please try again later") {
    super("RATE_LIMITED", message, 429);
  }
}
