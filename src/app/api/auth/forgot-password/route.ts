import { apiSuccess, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/origin-check";
import { forgotPasswordRateLimiter } from "@/lib/rate-limit";
import { RateLimitedError } from "@/lib/errors";
import { forgotPasswordSchema } from "@/validators/auth.validators";
import { authService } from "@/services/auth.service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const ip = request.headers.get("x-forwarded-for") ?? "local";
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    const { success } = await forgotPasswordRateLimiter.limit(`forgot:${ip}:${email}`);
    if (!success) throw new RateLimitedError();

    await authService.forgotPassword(email, request);

    // Always generic — never reveals whether the email exists.
    return apiSuccess(null, "If an account exists with that email, we've sent a password reset link.");
  } catch (error) {
    return handleApiError(error);
  }
}
