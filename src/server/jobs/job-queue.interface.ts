/**
 * Async job queue abstraction for expensive generation work (2D plan now; 3D model and
 * elevation generation will get their own queue instances in later phases). Real
 * consumer as of Phase 4: `PlanService` enqueues through this, and — since no real
 * queue/worker infrastructure exists yet (BullMQ/Redis is Phase 10) — also drives the
 * processing transitions inline, in the same request, the way a future worker process
 * would from outside. `DbJobQueueProvider` is the first real implementation.
 *
 * (Adjusted from the Phase 1 draft of this interface: dropped the generic `type` field
 * — a `JobQueue` instance is scoped to one job table/domain rather than multiplexing
 * job types through a single generic table, matching the spec's per-engine job model
 * naming, e.g. `PlanGenerationJob`. `result` became `resultId`, a reference to the
 * concrete output row rather than an embedded blob.)
 */

export type JobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface EnqueueJobInput<TPayload = unknown> {
  payload: TPayload;
  projectId: string;
}

export interface JobRecord<TPayload = unknown> {
  id: string;
  status: JobStatus;
  payload: TPayload;
  resultId: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobQueue {
  enqueue<TPayload>(input: EnqueueJobInput<TPayload>): Promise<JobRecord<TPayload>>;
  getStatus(jobId: string): Promise<JobRecord | null>;
  markProcessing(jobId: string): Promise<void>;
  markCompleted(jobId: string, resultId: string): Promise<void>;
  markFailed(jobId: string, error: string): Promise<void>;
}
