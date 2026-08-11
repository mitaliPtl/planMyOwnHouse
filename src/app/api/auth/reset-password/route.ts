import { apiSuccess, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/origin-check";
import { resetPasswordSchema } from "@/validators/auth.validators";
import { authService } from "@/services/auth.service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    await authService.resetPassword(token, password, request);

    return apiSuccess(null, "Password updated. You can now log in with your new password.");
  } catch (error) {
    return handleApiError(error);
  }
}
