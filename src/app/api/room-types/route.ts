import { apiSuccess, handleApiError } from "@/lib/api-response";
import { requireAuth } from "@/server/auth/require-auth";
import { roomService } from "@/services/room.service";

export async function GET() {
  try {
    await requireAuth();
    const roomTypes = await roomService.listRoomTypes();
    return apiSuccess(roomTypes);
  } catch (error) {
    return handleApiError(error);
  }
}
