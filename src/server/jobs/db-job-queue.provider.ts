import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { EnqueueJobInput, JobQueue, JobRecord } from "./job-queue.interface";

function mapJob<TPayload>(
  job: Awaited<ReturnType<typeof prisma.planGenerationJob.create>>
): JobRecord<TPayload> {
  return {
    id: job.id,
    status: job.status,
    payload: job.payload as TPayload,
    resultId: job.planId,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

/**
 * Real implementation, backed by the `PlanGenerationJob` table. Scoped to plan
 * generation specifically (not a generic multi-purpose job table) — see
 * job-queue.interface.ts for why. Future engines (3D, elevation) get their own
 * dedicated job table + provider pair rather than sharing this one.
 */
export class DbJobQueueProvider implements JobQueue {
  async enqueue<TPayload>(input: EnqueueJobInput<TPayload>): Promise<JobRecord<TPayload>> {
    const job = await prisma.planGenerationJob.create({
      data: {
        projectId: input.projectId,
        payload: input.payload as Prisma.InputJsonValue,
        status: "QUEUED",
      },
    });
    return mapJob<TPayload>(job);
  }

  async getStatus(jobId: string): Promise<JobRecord | null> {
    const job = await prisma.planGenerationJob.findUnique({ where: { id: jobId } });
    return job ? mapJob(job) : null;
  }

  async markProcessing(jobId: string): Promise<void> {
    await prisma.planGenerationJob.update({ where: { id: jobId }, data: { status: "PROCESSING" } });
  }

  async markCompleted(jobId: string, resultId: string): Promise<void> {
    await prisma.planGenerationJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED", planId: resultId },
    });
  }

  async markFailed(jobId: string, error: string): Promise<void> {
    await prisma.planGenerationJob.update({
      where: { id: jobId },
      data: { status: "FAILED", error },
    });
  }
}
