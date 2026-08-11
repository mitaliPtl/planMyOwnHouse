-- CreateEnum
CREATE TYPE "PlotUnit" AS ENUM ('FEET', 'METER', 'YARD');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "plots" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "unit" "PlotUnit" NOT NULL DEFAULT 'FEET',
    "floors" INTEGER NOT NULL DEFAULT 1,
    "roadSide" TEXT,
    "frontSetback" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rearSetback" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leftSetback" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rightSetback" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_types" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "minWidth" DOUBLE PRECISION NOT NULL,
    "minLength" DOUBLE PRECISION NOT NULL,
    "defaultWidth" DOUBLE PRECISION NOT NULL,
    "defaultLength" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_rooms" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "roomTypeId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "width" DOUBLE PRECISION NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "attachedBathroom" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_generation_jobs" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "planId" UUID,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "layoutData" JSONB NOT NULL,
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plots_projectId_key" ON "plots"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "room_types_name_key" ON "room_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "room_types_slug_key" ON "room_types"("slug");

-- CreateIndex
CREATE INDEX "project_rooms_projectId_idx" ON "project_rooms"("projectId");

-- CreateIndex
CREATE INDEX "plan_generation_jobs_projectId_idx" ON "plan_generation_jobs"("projectId");

-- CreateIndex
CREATE INDEX "plans_projectId_idx" ON "plans"("projectId");

-- AddForeignKey
ALTER TABLE "plots" ADD CONSTRAINT "plots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_rooms" ADD CONSTRAINT "project_rooms_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_rooms" ADD CONSTRAINT "project_rooms_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_generation_jobs" ADD CONSTRAINT "plan_generation_jobs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_generation_jobs" ADD CONSTRAINT "plan_generation_jobs_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
