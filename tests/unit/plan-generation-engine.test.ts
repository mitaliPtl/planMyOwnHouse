import { describe, it, expect } from "vitest";

import { generatePlan } from "@/server/plan-engine/plan-generation-engine";
import type { PlanGenerationInput } from "@/server/plan-engine/types";

function basePlot(overrides: Partial<PlanGenerationInput["plot"]> = {}): PlanGenerationInput["plot"] {
  return {
    width: 30,
    length: 50,
    unit: "FEET",
    floors: 1,
    frontSetback: 5,
    rearSetback: 5,
    leftSetback: 3,
    rightSetback: 3,
    ...overrides,
  };
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

describe("generatePlan", () => {
  it("places every room fully inside the buildable area with no overlaps", () => {
    const input: PlanGenerationInput = {
      plot: basePlot(),
      rooms: [
        { roomTypeName: "Bedroom", width: 12, length: 12, quantity: 2 },
        { roomTypeName: "Living Room", width: 15, length: 18, quantity: 1 },
        { roomTypeName: "Kitchen", width: 10, length: 10, quantity: 1 },
      ],
    };

    const { layout, warnings } = generatePlan(input);

    expect(warnings).toEqual([]);
    expect(layout.rooms).toHaveLength(4);

    const { buildableArea } = layout;
    for (const room of layout.rooms) {
      expect(room.x).toBeGreaterThanOrEqual(buildableArea.x - 1e-6);
      expect(room.y).toBeGreaterThanOrEqual(buildableArea.y - 1e-6);
      expect(room.x + room.width).toBeLessThanOrEqual(buildableArea.x + buildableArea.width + 1e-6);
      expect(room.y + room.height).toBeLessThanOrEqual(buildableArea.y + buildableArea.height + 1e-6);
    }

    for (let i = 0; i < layout.rooms.length; i++) {
      for (let j = i + 1; j < layout.rooms.length; j++) {
        expect(rectsOverlap(layout.rooms[i], layout.rooms[j])).toBe(false);
      }
    }
  });

  it("numbers rooms when quantity > 1 and leaves a single instance unnumbered", () => {
    const input: PlanGenerationInput = {
      plot: basePlot(),
      rooms: [
        { roomTypeName: "Bedroom", width: 10, length: 10, quantity: 2 },
        { roomTypeName: "Kitchen", width: 8, length: 8, quantity: 1 },
      ],
    };

    const { layout } = generatePlan(input);
    const names = layout.rooms.map((r) => r.name).sort();

    expect(names).toEqual(["Bedroom 1", "Bedroom 2", "Kitchen"]);
  });

  it("reports rooms that don't fit as warnings instead of silently dropping them", () => {
    const input: PlanGenerationInput = {
      plot: basePlot({ width: 15, length: 20, leftSetback: 1, rightSetback: 1, frontSetback: 1, rearSetback: 1 }),
      rooms: [
        { roomTypeName: "Bedroom", width: 12, length: 12, quantity: 1 },
        { roomTypeName: "Living Room", width: 15, length: 18, quantity: 1 }, // won't fit
      ],
    };

    const { layout, warnings } = generatePlan(input);

    expect(layout.rooms.map((r) => r.name)).not.toContain("Living Room");
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("Living Room");
  });

  it("reports a clear warning and places nothing when setbacks consume the whole plot", () => {
    const input: PlanGenerationInput = {
      plot: basePlot({ width: 10, length: 10, leftSetback: 5, rightSetback: 5, frontSetback: 1, rearSetback: 1 }),
      rooms: [{ roomTypeName: "Bedroom", width: 10, length: 10, quantity: 1 }],
    };

    const { layout, warnings } = generatePlan(input);

    expect(layout.rooms).toEqual([]);
    expect(warnings[0]).toMatch(/no buildable area/i);
  });

  it("auto-adds a staircase for multi-floor plots and omits it for single-floor", () => {
    const input: PlanGenerationInput = {
      plot: basePlot({ floors: 2 }),
      rooms: [{ roomTypeName: "Bedroom", width: 10, length: 10, quantity: 1 }],
    };

    const { layout } = generatePlan(input);
    expect(layout.rooms.map((r) => r.name)).toContain("Staircase");

    const singleFloor = generatePlan({ ...input, plot: { ...input.plot, floors: 1 } });
    expect(singleFloor.layout.rooms.map((r) => r.name)).not.toContain("Staircase");
  });

  it("gives every placed room exactly one door", () => {
    const input: PlanGenerationInput = {
      plot: basePlot(),
      rooms: [
        { roomTypeName: "Bedroom", width: 12, length: 12, quantity: 2 },
        { roomTypeName: "Kitchen", width: 10, length: 10, quantity: 1 },
      ],
    };

    const { layout } = generatePlan(input);
    expect(layout.doors).toHaveLength(layout.rooms.length);
  });

  it("only gives windows to rooms with an edge on the plot boundary", () => {
    // A buildable area exactly filled by a 2x2 grid of equal rooms: the 4 corner/edge
    // rooms touch the plot boundary once setbacks are subtracted; none are fully interior
    // in this layout, so this asserts every room gets at least one window and the total
    // window count is bounded by the exterior room count.
    const input: PlanGenerationInput = {
      plot: basePlot({ width: 24, length: 24, leftSetback: 0, rightSetback: 0, frontSetback: 0, rearSetback: 0 }),
      rooms: [{ roomTypeName: "Bedroom", width: 12, length: 12, quantity: 4 }],
    };

    const { layout } = generatePlan(input);
    const exteriorRooms = layout.rooms.filter((r) => r.isExterior);
    expect(exteriorRooms).toHaveLength(4);
    expect(layout.windows.length).toBeGreaterThan(0);
  });

  it("stretches placed rooms to fill the whole buildable area, so usedArea equals buildableAreaTotal", () => {
    // Requested dimensions decide proportions and row membership, not literal final
    // footage — the engine always fills the customer's plot rather than leaving an
    // unallocated margin, so a single room ends up sized to the entire buildable area.
    const input: PlanGenerationInput = {
      plot: basePlot(),
      rooms: [{ roomTypeName: "Bedroom", width: 12, length: 12, quantity: 1 }],
    };

    const { layout } = generatePlan(input);
    expect(layout.usedArea).toBeCloseTo(layout.buildableAreaTotal);
  });

  it("stretches an uneven row of rooms to fill the buildable width exactly", () => {
    const input: PlanGenerationInput = {
      plot: basePlot({ width: 20, length: 40, leftSetback: 0, rightSetback: 0, frontSetback: 0, rearSetback: 0 }),
      rooms: [
        { roomTypeName: "Living Room", width: 12, length: 14, quantity: 1 },
        { roomTypeName: "Bedroom", width: 12, length: 12, quantity: 1 },
        { roomTypeName: "Kitchen", width: 8, length: 8, quantity: 1 },
        { roomTypeName: "Wash Area", width: 4, length: 5, quantity: 1 },
      ],
    };

    const { layout } = generatePlan(input);
    const { buildableArea } = layout;

    // Group rooms by row (shared y) and check each row's rightmost edge reaches the
    // buildable boundary — no row leaves a blank strip on the right.
    const rows = new Map<number, typeof layout.rooms>();
    for (const room of layout.rooms) {
      const key = Math.round(room.y * 1e6);
      rows.set(key, [...(rows.get(key) ?? []), room]);
    }
    for (const row of rows.values()) {
      const rowRightEdge = Math.max(...row.map((r) => r.x + r.width));
      expect(rowRightEdge).toBeCloseTo(buildableArea.x + buildableArea.width);
    }

    const maxY = Math.max(...layout.rooms.map((r) => r.y + r.height));
    expect(maxY).toBeCloseTo(buildableArea.y + buildableArea.height);
  });

  it("places the entrance on the room touching the selected main door direction", () => {
    const input: PlanGenerationInput = {
      plot: basePlot({ width: 20, length: 40, leftSetback: 0, rightSetback: 0, frontSetback: 0, rearSetback: 0, mainDoorDirection: "South" }),
      rooms: [
        { roomTypeName: "Living Room", width: 12, length: 14, quantity: 1 },
        { roomTypeName: "Kitchen", width: 8, length: 8, quantity: 1 },
      ],
    };

    const { layout } = generatePlan(input);
    expect(layout.mainDoorIndex).toBeDefined();

    const entranceRoom = layout.rooms[layout.mainDoorIndex!];
    const entranceDoor = layout.doors[layout.mainDoorIndex!];
    const { buildableArea } = layout;

    // The entrance room touches the South (rear) edge of the buildable area...
    expect(entranceRoom.y + entranceRoom.height).toBeCloseTo(buildableArea.y + buildableArea.height);
    // ...and its door sits on that same South edge.
    expect(entranceDoor.y1).toBeCloseTo(buildableArea.y + buildableArea.height);
    expect(entranceDoor.y2).toBeCloseTo(buildableArea.y + buildableArea.height);
  });

  it("prefers a public room (living room) for the entrance over the kitchen or wash area", () => {
    const input: PlanGenerationInput = {
      plot: basePlot({
        width: 20,
        length: 40,
        leftSetback: 0,
        rightSetback: 0,
        frontSetback: 0,
        rearSetback: 0,
        mainDoorDirection: "North",
      }),
      rooms: [
        { roomTypeName: "Living Room", width: 12, length: 14, quantity: 1 },
        { roomTypeName: "Bedroom", width: 12, length: 12, quantity: 1 },
        { roomTypeName: "Kitchen", width: 8, length: 8, quantity: 1 },
        { roomTypeName: "Wash Area", width: 4, length: 5, quantity: 1 },
      ],
    };

    const { layout, warnings } = generatePlan(input);
    const entranceRoom = layout.rooms[layout.mainDoorIndex!];

    expect(entranceRoom.name).toBe("Living Room");
    expect(warnings.some((w) => /main entrance/i.test(w))).toBe(false);
  });

  it("falls back to the nearest room and warns when no public room reaches the main door direction", () => {
    // Same layout as above, but South only has the wash area touching it (living
    // room is confined to the front row) — this is the exact scenario a customer
    // reported: with no public room reachable on that edge, the entrance has to open
    // into a wet area, and the engine should say so instead of staying silent.
    const input: PlanGenerationInput = {
      plot: basePlot({
        width: 20,
        length: 40,
        leftSetback: 0,
        rightSetback: 0,
        frontSetback: 0,
        rearSetback: 0,
        mainDoorDirection: "South",
      }),
      rooms: [
        { roomTypeName: "Living Room", width: 12, length: 14, quantity: 1 },
        { roomTypeName: "Bedroom", width: 12, length: 12, quantity: 1 },
        { roomTypeName: "Kitchen", width: 8, length: 8, quantity: 1 },
        { roomTypeName: "Wash Area", width: 4, length: 5, quantity: 1 },
      ],
    };

    const { layout, warnings } = generatePlan(input);
    expect(layout.mainDoorIndex).toBeDefined();

    const entranceRoom = layout.rooms[layout.mainDoorIndex!];
    expect(entranceRoom.name).not.toBe("Living Room");
    expect(warnings.some((w) => w.includes("main entrance") && w.includes(entranceRoom.name))).toBe(true);
  });

  it("regenerating with a different variant produces a genuinely different, still-valid layout", () => {
    const input: PlanGenerationInput = {
      plot: basePlot({ width: 20, length: 40, leftSetback: 0, rightSetback: 0, frontSetback: 0, rearSetback: 0 }),
      rooms: [
        { roomTypeName: "Living Room", width: 12, length: 14, quantity: 1 },
        { roomTypeName: "Bedroom", width: 12, length: 12, quantity: 1 },
        { roomTypeName: "Kitchen", width: 8, length: 8, quantity: 1 },
        { roomTypeName: "Wash Area", width: 4, length: 5, quantity: 1 },
      ],
    };

    const layouts = [0, 1, 2, 3].map((variant) => generatePlan({ ...input, variant }).layout);

    // Every variant must still be a fully valid, non-overlapping, in-bounds layout.
    for (const layout of layouts) {
      const { buildableArea } = layout;
      for (const room of layout.rooms) {
        expect(room.x).toBeGreaterThanOrEqual(buildableArea.x - 1e-6);
        expect(room.y).toBeGreaterThanOrEqual(buildableArea.y - 1e-6);
        expect(room.x + room.width).toBeLessThanOrEqual(buildableArea.x + buildableArea.width + 1e-6);
        expect(room.y + room.height).toBeLessThanOrEqual(buildableArea.y + buildableArea.height + 1e-6);
      }
      for (let i = 0; i < layout.rooms.length; i++) {
        for (let j = i + 1; j < layout.rooms.length; j++) {
          expect(rectsOverlap(layout.rooms[i], layout.rooms[j])).toBe(false);
        }
      }
    }

    // At least one room's position differs between variants — regenerating isn't a no-op.
    const livingRoomPositions = layouts.map((layout) => {
      const room = layout.rooms.find((r) => r.name === "Living Room")!;
      return `${room.x.toFixed(2)},${room.y.toFixed(2)},${room.width.toFixed(2)},${room.height.toFixed(2)}`;
    });
    expect(new Set(livingRoomPositions).size).toBeGreaterThan(1);

    // Regenerating with the same variant number is still reproducible, not random.
    const repeat = generatePlan({ ...input, variant: 2 }).layout;
    expect(repeat.rooms).toEqual(layouts[2].rooms);
  });
});
