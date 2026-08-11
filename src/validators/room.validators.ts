import { z } from "zod";

export const roomEntrySchema = z.object({
  roomTypeId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(10),
  width: z.coerce.number().positive("Width must be greater than 0."),
  length: z.coerce.number().positive("Length must be greater than 0."),
  attachedBathroom: z.boolean().default(false),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const saveRoomsSchema = z.object({
  rooms: z.array(roomEntrySchema).min(1, "Select at least one room."),
});

export type RoomEntryInput = z.infer<typeof roomEntrySchema>;
export type SaveRoomsInput = z.infer<typeof saveRoomsSchema>;
