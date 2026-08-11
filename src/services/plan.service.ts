import "server-only";

import { planRepository } from "@/repositories/plan.repository";
import { plotRepository } from "@/repositories/plot.repository";
import { projectRoomRepository } from "@/repositories/project-room.repository";
import { projectService } from "@/services/project.service";
import { auditLogService } from "@/services/audit-log.service";
import { DbJobQueueProvider } from "@/server/jobs/db-job-queue.provider";
import { generatePlan as runPlanEngine } from "@/server/plan-engine/plan-generation-engine";
import { AppError, ValidationError } from "@/lib/errors";
import type { PlanGenerationInput } from "@/server/plan-engine/types";

const jobQueue = new DbJobQueueProvider();

export const planService = {
  async getLatestPlan(customerId: string, projectId: string) {
    await projectService.getProject(customerId, projectId);
    return planRepository.findLatestByProjectId(projectId);
  },

  async listVersions(customerId: string, projectId: string) {
    await projectService.getProject(customerId, projectId);
    return planRepository.findAllVersionsByProjectId(projectId);
  },

  async generatePlan(customerId: string, projectId: string, request?: Request) {
    await projectService.getProject(customerId, projectId);

    const plot = await plotRepository.findByProjectId(projectId);
    if (!plot) {
      throw new ValidationError("Save plot details before generating a plan.");
    }

    const projectRooms = await projectRoomRepository.findByProjectId(projectId);
    if (projectRooms.length === 0) {
      throw new ValidationError("Add at least one room before generating a plan.");
    }

    // Basing the variant on the upcoming version number (rather than randomizing)
    // keeps regeneration deterministic and reproducible while still cycling through
    // the engine's 4 layout variants instead of repeating the same plan every time.
    const nextVersion = await planRepository.getNextVersion(projectId);

    const input: PlanGenerationInput = {
      plot: {
        width: plot.width,
        length: plot.length,
        unit: plot.unit,
        floors: plot.floors,
        frontSetback: plot.frontSetback,
        rearSetback: plot.rearSetback,
        leftSetback: plot.leftSetback,
        rightSetback: plot.rightSetback,
        mainDoorDirection: plot.mainDoorDirection as
          | "North"
          | "South"
          | "East"
          | "West"
          | undefined,
      },
      rooms: projectRooms.map((room) => ({
        roomTypeName: room.roomType.name,
        width: room.width,
        length: room.length,
        quantity: room.quantity,
      })),
      variant: nextVersion - 1,
    };

    const job = await jobQueue.enqueue({ projectId, payload: input });
    await jobQueue.markProcessing(job.id);

    try {
      const { layout, warnings } = runPlanEngine(input);
      const plan = await planRepository.create(projectId, nextVersion, layout, warnings);
      await jobQueue.markCompleted(job.id, plan.id);

      await auditLogService.log("PLAN_GENERATED", {
        userId: customerId,
        entityType: "Plan",
        entityId: plan.id,
        metadata: { version: plan.version, warningCount: warnings.length },
        request,
      });

      return { plan, warnings };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Plan generation failed.";
      await jobQueue.markFailed(job.id, message);
      throw new AppError("PLAN_GENERATION_FAILED", "Unable to generate plan.", 500);
    }
  },
};
