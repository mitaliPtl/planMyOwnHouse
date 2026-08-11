import { apiSuccess, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/origin-check";
import { requireAuth } from "@/server/auth/require-auth";
import { planService } from "@/services/plan.service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);

    const user = await requireAuth();
    const { id } = await params;
    const { plan, warnings } = await planService.generatePlan(user.id, id, request);

    return apiSuccess({ plan, warnings }, "Plan generated.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
