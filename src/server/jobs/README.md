# Jobs

Real as of Phase 4: `DbJobQueueProvider` is backed by the `PlanGenerationJob` table and
is used by `src/services/plan.service.ts`. Status transitions (QUEUED → PROCESSING →
COMPLETED/FAILED) currently happen inline in the same request, since no real
queue/worker infrastructure exists yet — Phase 10 swaps in BullMQ/Redis behind this
same `JobQueue` interface, with a real worker process calling `markProcessing`/
`markCompleted`/`markFailed` instead of the request handler doing it inline.
