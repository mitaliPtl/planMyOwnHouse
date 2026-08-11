import { apiSuccess, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/origin-check";
import { signupRateLimiter } from "@/lib/rate-limit";
import { RateLimitedError } from "@/lib/errors";
import { signupSchema } from "@/validators/auth.validators";
import { authService } from "@/services/auth.service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const ip = request.headers.get("x-forwarded-for") ?? "local";
    const body = await request.json();
    const input = signupSchema.parse(body);

    const { success } = await signupRateLimiter.limit(`signup:${ip}:${input.email}`);
    if (!success) throw new RateLimitedError();

    const user = await authService.signup(input, request);

    return apiSuccess(
      user,
      "Account created. Check your email to verify your address before logging in.",
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
