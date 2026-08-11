import "server-only";

import { prisma } from "@/lib/prisma";

export const roomTypeRepository = {
  findAllActive() {
    return prisma.roomType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  },

  findManyByIds(ids: string[]) {
    return prisma.roomType.findMany({ where: { id: { in: ids } } });
  },
};
