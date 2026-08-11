import { apiSuccess, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/origin-check";
import { requireAuth } from "@/server/auth/require-auth";
import { updateProjectSchema } from "@/validators/project.validators";
import { projectService } from "@/services/project.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const project = await projectService.getProject(user.id, id);
    return apiSuccess(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);

    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const input = updateProjectSchema.parse(body);

    const project = await projectService.updateProject(user.id, id, input, request);

    return apiSuccess(project, "Project updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);

    const user = await requireAuth();
    const { id } = await params;
    await projectService.deleteProject(user.id, id, request);

    return apiSuccess(null, "Project deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
