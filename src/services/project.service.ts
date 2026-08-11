import "server-only";

import { projectRepository } from "@/repositories/project.repository";
import { auditLogService } from "@/services/audit-log.service";
import { NotFoundError } from "@/lib/errors";
import type { CreateProjectInput, UpdateProjectInput } from "@/validators/project.validators";

export const projectService = {
  async listProjects(customerId: string, search?: string) {
    return projectRepository.findManyByCustomer(customerId, search);
  },

  async getProject(customerId: string, projectId: string) {
    const project = await projectRepository.findByIdForCustomer(customerId, projectId);
    if (!project) throw new NotFoundError("Project not found.");
    return project;
  },

  async getDashboardStats(customerId: string) {
    const totalProjects = await projectRepository.countByCustomer(customerId);
    return {
      totalProjects,
      // 2D/3D/elevation/estimate generation isn't implemented yet (Phases 4-7) — these
      // are genuinely 0, not placeholder/fake numbers.
      plans2dGenerated: 0,
      designs3dGenerated: 0,
      elevationsGenerated: 0,
      estimatesGenerated: 0,
    };
  },

  async createProject(customerId: string, input: CreateProjectInput, request?: Request) {
    const project = await projectRepository.create(customerId, input);
    await auditLogService.log("PROJECT_CREATED", {
      userId: customerId,
      entityType: "Project",
      entityId: project.id,
      request,
    });
    return project;
  },

  async updateProject(
    customerId: string,
    projectId: string,
    input: UpdateProjectInput,
    request?: Request
  ) {
    const updated = await projectRepository.update(customerId, projectId, input);
    if (!updated) throw new NotFoundError("Project not found.");
    await auditLogService.log("PROJECT_UPDATED", {
      userId: customerId,
      entityType: "Project",
      entityId: projectId,
      request,
    });
    return updated;
  },

  async archiveProject(customerId: string, projectId: string, request?: Request) {
    const ok = await projectRepository.updateStatus(customerId, projectId, "ARCHIVED");
    if (!ok) throw new NotFoundError("Project not found.");
    await auditLogService.log("PROJECT_ARCHIVED", {
      userId: customerId,
      entityType: "Project",
      entityId: projectId,
      request,
    });
  },

  async deleteProject(customerId: string, projectId: string, request?: Request) {
    const ok = await projectRepository.delete(customerId, projectId);
    if (!ok) throw new NotFoundError("Project not found.");
    await auditLogService.log("PROJECT_DELETED", {
      userId: customerId,
      entityType: "Project",
      entityId: projectId,
      request,
    });
  },

  async duplicateProject(customerId: string, projectId: string, request?: Request) {
    const source = await projectRepository.findByIdForCustomer(customerId, projectId);
    if (!source) throw new NotFoundError("Project not found.");

    const copy = await projectRepository.duplicate(customerId, source);
    await auditLogService.log("PROJECT_DUPLICATED", {
      userId: customerId,
      entityType: "Project",
      entityId: copy.id,
      metadata: { sourceProjectId: projectId },
      request,
    });
    return copy;
  },
};
