import "server-only";

import { prisma } from "@/lib/prisma";
import type { RoomEntryInput } from "@/validators/room.validators";

export const projectRoomRepository = {
  findByProjectId(projectId: string) {
    return prisma.projectRoom.findMany({
      where: { projectId },
      include: { roomType: true },
      orderBy: { roomType: { sortOrder: "asc" } },
    });
  },

  // Bulk replace — the Rooms wizard step saves the whole selection at once rather
  // than exposing granular per-room CRUD.
  replaceForProject(projectId: string, rooms: RoomEntryInput[]) {
    return prisma.$transaction(async (tx) => {
      await tx.projectRoom.deleteMany({ where: { projectId } });
      if (rooms.length === 0) return [];
      await tx.projectRoom.createMany({
        data: rooms.map((room) => ({
          projectId,
          roomTypeId: room.roomTypeId,
          quantity: room.quantity,
          width: room.width,
          length: room.length,
          attachedBathroom: room.attachedBathroom,
          notes: room.notes || null,
        })),
      });
      return tx.projectRoom.findMany({ where: { projectId }, include: { roomType: true } });
    });
  },
};
