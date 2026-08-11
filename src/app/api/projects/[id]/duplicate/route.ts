import { apiSuccess, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/origin-check";
import { requireAuth } from "@/server/auth/require-auth";
import { projectService } from "@/services/project.service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);

    const user = await requireAuth();
    const { id } = await params;
    const copy = await projectService.duplicateProject(user.id, id, request);

    return apiSuccess(copy, "Project duplicated.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
