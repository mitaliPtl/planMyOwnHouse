"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { putJson } from "@/lib/api-client";

export interface RoomTypeOption {
  id: string;
  name: string;
  minWidth: number;
  minLength: number;
  defaultWidth: number;
  defaultLength: number;
}

interface RoomConfig {
  quantity: number;
  width: number;
  length: number;
  attachedBathroom: boolean;
}

interface RoomsFormProps {
  projectId: string;
  roomTypes: RoomTypeOption[];
  initial: Record<string, RoomConfig>;
}

export function RoomsForm({ projectId, roomTypes, initial }: RoomsFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, RoomConfig>>(initial);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggle(roomType: RoomTypeOption, checked: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      if (checked) {
        next[roomType.id] = prev[roomType.id] ?? {
          quantity: 1,
          width: roomType.defaultWidth,
          length: roomType.defaultLength,
          attachedBathroom: false,
        };
      } else {
        delete next[roomType.id];
      }
      return next;
    });
  }

  function updateField(roomTypeId: string, field: keyof RoomConfig, value: number | boolean) {
    setSelected((prev) => ({
      ...prev,
      [roomTypeId]: { ...prev[roomTypeId], [field]: value },
    }));
  }

  async function handleSubmit() {
    setFormError(null);

    const rooms = Object.entries(selected).map(([roomTypeId, config]) => ({
      roomTypeId,
      ...config,
    }));

    if (rooms.length === 0) {
      setFormError("Select at least one room.");
      return;
    }

    setIsSubmitting(true);
    const result = await putJson(`/api/projects/${projectId}/rooms`, { rooms });
    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.message);
      return;
    }

    router.push(`/projects/${projectId}/plan`);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      {formError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3">
        {roomTypes.map((roomType) => {
          const config = selected[roomType.id];
          const isSelected = Boolean(config);

          return (
            <Card key={roomType.id}>
              <CardContent className="grid gap-3">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => toggle(roomType, checked === true)}
                  />
                  <span className="font-medium text-foreground">{roomType.name}</span>
                  <span className="text-xs text-muted-foreground">
                    min {roomType.minWidth}×{roomType.minLength} ft
                  </span>
                </label>

                {isSelected && config && (
                  <div className="grid grid-cols-2 gap-3 pl-6 sm:grid-cols-4">
                    <div className="grid gap-1">
                      <Label htmlFor={`${roomType.id}-qty`}>Quantity</Label>
                      <Input
                        id={`${roomType.id}-qty`}
                        type="number"
                        min={1}
                        max={10}
                        value={config.quantity}
                        onChange={(e) => updateField(roomType.id, "quantity", Number(e.target.value))}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor={`${roomType.id}-width`}>Width</Label>
                      <Input
                        id={`${roomType.id}-width`}
                        type="number"
                        step="any"
                        value={config.width}
                        onChange={(e) => updateField(roomType.id, "width", Number(e.target.value))}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor={`${roomType.id}-length`}>Length</Label>
                      <Input
                        id={`${roomType.id}-length`}
                        type="number"
                        step="any"
                        value={config.length}
                        onChange={(e) => updateField(roomType.id, "length", Number(e.target.value))}
                      />
                    </div>
                    <label className="flex items-center gap-2 self-end pb-1.5">
                      <Checkbox
                        checked={config.attachedBathroom}
                        onCheckedChange={(checked) =>
                          updateField(roomType.id, "attachedBathroom", checked === true)
                        }
                      />
                      <span className="text-sm text-muted-foreground">Attached bathroom</span>
                    </label>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button onClick={handleSubmit} disabled={isSubmitting} className="w-fit">
        {isSubmitting && <Spinner />}
        Save & continue
      </Button>
    </div>
  );
}
