import { apiSuccess, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/origin-check";
import { requireAuth } from "@/server/auth/require-auth";
import { saveRoomsSchema } from "@/validators/room.validators";
import { roomService } from "@/services/room.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const rooms = await roomService.listProjectRooms(user.id, id);
    return apiSuccess(rooms);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);

    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { rooms } = saveRoomsSchema.parse(body);

    const saved = await roomService.saveRooms(user.id, id, rooms, request);

    return apiSuccess(saved, "Rooms saved.");
  } catch (error) {
    return handleApiError(error);
  }
}
