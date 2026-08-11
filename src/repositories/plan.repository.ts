import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { PlanLayout } from "@/server/plan-engine/types";

export const planRepository = {
  async findLatestByProjectId(projectId: string) {
    return prisma.plan.findFirst({
      where: { projectId },
      orderBy: { version: "desc" },
    });
  },

  async getNextVersion(projectId: string) {
    const latest = await prisma.plan.findFirst({
      where: { projectId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    return (latest?.version ?? 0) + 1;
  },

  async create(projectId: string, version: number, layout: PlanLayout, warnings: string[]) {
    return prisma.plan.create({
      data: {
        projectId,
        version,
        layoutData: layout as unknown as Prisma.InputJsonValue,
        warnings: warnings as unknown as Prisma.InputJsonValue,
      },
    });
  },

  findAllVersionsByProjectId(projectId: string) {
    return prisma.plan.findMany({
      where: { projectId },
      orderBy: { version: "desc" },
      select: { id: true, version: true, createdAt: true, warnings: true },
    });
  },
};
