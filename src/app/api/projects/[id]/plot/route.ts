import { apiSuccess, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/origin-check";
import { requireAuth } from "@/server/auth/require-auth";
import { plotSchema } from "@/validators/plot.validators";
import { plotService } from "@/services/plot.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const plot = await plotService.getPlot(user.id, id);
    return apiSuccess(plot);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);

    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const input = plotSchema.parse(body);

    const plot = await plotService.savePlot(user.id, id, input, request);

    return apiSuccess(plot, "Plot details saved.");
  } catch (error) {
    return handleApiError(error);
  }
}
