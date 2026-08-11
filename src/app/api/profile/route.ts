import { apiSuccess, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/origin-check";
import { requireAuth } from "@/server/auth/require-auth";
import { updateProfileSchema } from "@/validators/profile.validators";
import { userService } from "@/services/user.service";

export async function GET() {
  try {
    const user = await requireAuth();
    const profile = await userService.getProfile(user.id);
    return apiSuccess(profile);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);

    const user = await requireAuth();
    const body = await request.json();
    const input = updateProfileSchema.parse(body);

    const profile = await userService.updateProfile(user.id, input, request);

    return apiSuccess(profile, "Profile updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
