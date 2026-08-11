import { apiSuccess, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/origin-check";
import { resendVerificationRateLimiter } from "@/lib/rate-limit";
import { RateLimitedError } from "@/lib/errors";
import { resendVerificationSchema } from "@/validators/auth.validators";
import { authService } from "@/services/auth.service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const ip = request.headers.get("x-forwarded-for") ?? "local";
    const body = await request.json();
    const { email } = resendVerificationSchema.parse(body);

    const { success } = await resendVerificationRateLimiter.limit(`resend:${ip}:${email}`);
    if (!success) throw new RateLimitedError();

    await authService.resendVerification(email);

    return apiSuccess(null, "If an account exists and isn't verified yet, we've sent a new link.");
  } catch (error) {
    return handleApiError(error);
  }
}
