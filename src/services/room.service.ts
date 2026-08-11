import "server-only";

import { roomTypeRepository } from "@/repositories/room-type.repository";
import { projectRoomRepository } from "@/repositories/project-room.repository";
import { projectService } from "@/services/project.service";
import { auditLogService } from "@/services/audit-log.service";
import { ValidationError } from "@/lib/errors";
import type { RoomEntryInput } from "@/validators/room.validators";

export const roomService = {
  listRoomTypes() {
    return roomTypeRepository.findAllActive();
  },

  async listProjectRooms(customerId: string, projectId: string) {
    await projectService.getProject(customerId, projectId);
    return projectRoomRepository.findByProjectId(projectId);
  },

  async saveRooms(
    customerId: string,
    projectId: string,
    rooms: RoomEntryInput[],
    request?: Request
  ) {
    await projectService.getProject(customerId, projectId);

    const roomTypes = await roomTypeRepository.findManyByIds(rooms.map((r) => r.roomTypeId));
    const roomTypeById = new Map(roomTypes.map((rt) => [rt.id, rt]));

    const errors: { path: (string | number)[]; message: string }[] = [];
    rooms.forEach((room, index) => {
      const roomType = roomTypeById.get(room.roomTypeId);
      if (!roomType) {
        errors.push({ path: [index, "roomTypeId"], message: "Unknown room type." });
        return;
      }
      if (room.width < roomType.minWidth || room.length < roomType.minLength) {
        errors.push({
          path: [index, "width"],
          message: `${roomType.name} must be at least ${roomType.minWidth} x ${roomType.minLength} ft.`,
        });
      }
    });

    if (errors.length > 0) {
      throw new ValidationError("Some rooms don't meet the minimum size for their type.", errors);
    }

    const saved = await projectRoomRepository.replaceForProject(projectId, rooms);

    await auditLogService.log("ROOMS_SAVED", {
      userId: customerId,
      entityType: "Project",
      entityId: projectId,
      metadata: { roomCount: rooms.length },
      request,
    });

    return saved;
  },
};
