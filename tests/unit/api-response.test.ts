import { describe, it, expect } from "vitest";
import { ZodError, z } from "zod";

import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";
import { AppError, ValidationError } from "@/lib/errors";

describe("apiSuccess", () => {
  it("returns a { success: true } envelope with the given data and status", async () => {
    const response = apiSuccess({ id: "1" }, "Created", 201);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({ success: true, message: "Created", data: { id: "1" } });
  });
});

describe("apiError", () => {
  it("returns a { success: false } envelope with code and errors", async () => {
    const response = apiError("Bad input", "VALIDATION_ERROR", 422, [{ path: "email" }]);
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      message: "Bad input",
      code: "VALIDATION_ERROR",
      errors: [{ path: "email" }],
    });
  });
});

describe("handleApiError", () => {
  it("maps AppError to its own status/code/message", async () => {
    const response = handleApiError(new AppError("EMAIL_TAKEN", "Already exists", 409));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe("EMAIL_TAKEN");
    expect(body.success).toBe(false);
  });

  it("maps ValidationError to a 422", async () => {
    const response = handleApiError(new ValidationError("Invalid"));
    expect(response.status).toBe(422);
  });

  it("maps a ZodError to a 422 VALIDATION_ERROR with issues as errors", async () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);

    const response = handleApiError(result.error as ZodError);
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it("never leaks raw error details for unknown errors — returns a generic 500", async () => {
    const response = handleApiError(new Error("some internal secret detail"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.message).not.toContain("secret");
  });
});
