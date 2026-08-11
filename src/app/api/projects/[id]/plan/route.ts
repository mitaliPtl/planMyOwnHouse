import { apiSuccess, handleApiError } from "@/lib/api-response";
import { requireAuth } from "@/server/auth/require-auth";
import { planService } from "@/services/plan.service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const plan = await planService.getLatestPlan(user.id, id);
    return apiSuccess(plan);
  } catch (error) {
    return handleApiError(error);
  }
}
