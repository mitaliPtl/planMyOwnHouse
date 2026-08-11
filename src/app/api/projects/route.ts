import { apiSuccess, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/origin-check";
import { requireAuth } from "@/server/auth/require-auth";
import { createProjectSchema } from "@/validators/project.validators";
import { projectService } from "@/services/project.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const search = new URL(request.url).searchParams.get("q") ?? undefined;
    const projects = await projectService.listProjects(user.id, search);
    return apiSuccess(projects);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const user = await requireAuth();
    const body = await request.json();
    const input = createProjectSchema.parse(body);

    const project = await projectService.createProject(user.id, input, request);

    return apiSuccess(project, "Project created.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
