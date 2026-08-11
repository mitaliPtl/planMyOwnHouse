import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireAuth } from "@/server/auth/require-auth";
import { roomService } from "@/services/room.service";
import { RoomsForm } from "@/features/plan-engine/components/rooms-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NotFoundError } from "@/lib/errors";

export const metadata: Metadata = { title: "Requirements & Room Settings" };

export default async function RoomsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  let projectRooms;
  try {
    projectRooms = await roomService.listProjectRooms(user.id, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const roomTypes = await roomService.listRoomTypes();

  const initial = Object.fromEntries(
    projectRooms.map((room) => [
      room.roomTypeId,
      {
        quantity: room.quantity,
        width: room.width,
        length: room.length,
        attachedBathroom: room.attachedBathroom,
      },
    ])
  );

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <Link
        href={`/projects/${id}`}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to project
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-navy">Requirements & Room Settings</h1>
        <p className="text-sm text-muted-foreground">
          Choose the rooms you want and set their dimensions (same unit as your plot).
          A staircase is added automatically for multi-floor plots.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rooms</CardTitle>
          <CardDescription>Room types are managed by planMyOwnHouse and kept up to date.</CardDescription>
        </CardHeader>
        <CardContent>
          <RoomsForm projectId={id} roomTypes={roomTypes} initial={initial} />
        </CardContent>
      </Card>
    </div>
  );
}
