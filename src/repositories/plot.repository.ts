import "server-only";

import { prisma } from "@/lib/prisma";
import type { PlotInput } from "@/validators/plot.validators";

export const plotRepository = {
  findByProjectId(projectId: string) {
    return prisma.plot.findUnique({ where: { projectId } });
  },

  upsert(projectId: string, input: PlotInput) {
    return prisma.plot.upsert({
      where: { projectId },
      update: input,
      create: { ...input, projectId },
    });
  },
};
