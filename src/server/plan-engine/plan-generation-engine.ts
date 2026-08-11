import type {
  PlanGenerationInput,
  PlanGenerationResult,
  PlacedRoom,
  Segment,
  Rect,
  Direction,
} from "./types";

/**
 * Basic Automatic Layout Engine (v1).
 *
 * This is a deterministic row-packing heuristic, not an architecturally-optimized or
 * AI-assisted layout algorithm — true floor-plan optimization is explicitly future
 * work (see docs/roadmap.md, spec §54). What it guarantees:
 *
 *   - Every placed room is fully inside the buildable area (plot minus setbacks) and
 *     never overlaps another placed room — both by construction of the packing loop,
 *     not by a separate overlap-detection pass.
 *   - Rooms that don't fit as requested are reported in `warnings`, never silently
 *     dropped.
 *   - Placed rooms fill the entire buildable area — the customer's requested room
 *     dimensions decide each room's proportions and which row/column it lands in, but
 *     rows are stretched to the buildable width and stacked rows are stretched to the
 *     buildable height, so the generated plan never leaves an unallocated strip of
 *     plot. (Room dimensions shown in the plan reflect the room's actual placed size,
 *     which is why `showDimensions` labels may differ slightly from the footage the
 *     customer typed in — that footage is a relative starting point, not a literal
 *     guarantee, exactly like the "fit requirements into the available plot" behavior
 *     this engine is meant to provide.)
 *   - If a `mainDoorDirection` is given, the engine prefers a public/social room
 *     (living room, hall, dining, foyer — see `PUBLIC_ROOM_KEYWORDS`) among whichever
 *     placed rooms touch that edge of the buildable area, and puts its door there
 *     (overriding that room's normal heuristic edge) — the entrance shouldn't open
 *     directly into a kitchen or wash area. If no public room reaches that edge, the
 *     nearest available room gets the door instead and a warning explains why, rather
 *     than silently producing a plan that looks fine but isn't.
 *   - Rooms are placed in (public, private, service) category order, largest-first
 *     within each category — public/social rooms get first claim on the "good" spots
 *     near the front of the packing order, kitchens/wash areas/utility rooms are
 *     placed last. This is a simple bias, not real adjacency planning (see below).
 *   - `variant` (0-3, see `packRooms`) selects one of four equally-valid arrangements
 *     of the same rooms, so regenerating a plan produces a genuinely different result
 *     instead of the identical layout every time — deterministic per variant, not
 *     random, so a given variant is reproducible.
 *
 * What it does NOT do (documented limitations, not oversights):
 *   - No real adjacency/circulation reasoning (e.g. kitchen near dining). Beyond the
 *     public/private/service placement-order bias and the entrance-room preference
 *     above, rooms are placed in descending-area order within their category.
 *   - Door placement (other than the main entrance above) is a fixed heuristic (each
 *     room's door sits on whichever edge is closest to the front setback line), not a
 *     real circulation-path computation.
 *   - Walls are each room's own four edges. Two adjacent rooms sharing a boundary each
 *     contribute a coincident wall segment rather than a single merged wall.
 *   - Only 4 layout variants exist — regenerating a 5th time repeats variant 0.
 *
 * Coordinate system: origin (0,0) at the plot's front-left corner. x grows rightward
 * (across plot width), y grows toward the rear (across plot length).
 */

const DOOR_WIDTH = 3;
const WINDOW_WIDTH = 3;
const STAIRCASE_WIDTH = 4;
const STAIRCASE_LENGTH = 11;
const EPSILON = 1e-6;

// Rough room-category buckets, matched by keyword against the room type name. Used to
// bias placement order and to pick which room the main entrance opens into — the
// entrance should lead into a public/social room, not a kitchen or wash area, which is
// both common sense and standard Indian home-planning convention (Vastu keeps wet
// areas away from the main entrance). This is a keyword match, not a configurable
// taxonomy — see the module docstring for what "basic" means here.
const PUBLIC_ROOM_KEYWORDS = ["living", "hall", "drawing", "family room", "lounge", "foyer", "dining"];
const SERVICE_ROOM_KEYWORDS = [
  "kitchen",
  "wash",
  "bath",
  "toilet",
  "utility",
  "store",
  "servant",
  "garage",
  "parking",
];

function categoryPriority(roomName: string): number {
  const name = roomName.toLowerCase();
  if (PUBLIC_ROOM_KEYWORDS.some((k) => name.includes(k))) return 0; // public — placed/entered first
  if (SERVICE_ROOM_KEYWORDS.some((k) => name.includes(k))) return 2; // service/wet — placed/entered last
  return 1; // private (bedrooms, study, pooja room, staircase, ...)
}

function isPublicRoom(roomName: string): boolean {
  return categoryPriority(roomName) === 0;
}

export const PLAN_VARIANT_COUNT = 4;

function resolveVariant(variant: number | undefined): number {
  const v = variant ?? 0;
  return ((v % PLAN_VARIANT_COUNT) + PLAN_VARIANT_COUNT) % PLAN_VARIANT_COUNT;
}

function expandRoomInstances(rooms: PlanGenerationInput["rooms"]) {
  const instances: { name: string; width: number; length: number }[] = [];
  for (const room of rooms) {
    for (let i = 0; i < room.quantity; i++) {
      instances.push({
        name: room.quantity > 1 ? `${room.roomTypeName} ${i + 1}` : room.roomTypeName,
        width: room.width,
        length: room.length,
      });
    }
  }
  return instances;
}

interface RawInstance {
  name: string;
  width: number;
  length: number;
}

interface RawPlacement {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Row-major fit + stretch pass: fills left-to-right, wraps top-to-bottom, then
 * stretches rows/columns to exactly fill `buildable`. Shared by every variant —
 * column-major variants call this on a transposed rect/instance set (see
 * `packRooms`). */
function packRowMajor(buildable: Rect, instances: RawInstance[]) {
  // (public, private, service) category first, largest-area-first within each
  // category — public/social rooms get first claim on the packing order (see module
  // docstring), kitchens/wash areas/utility rooms are placed last.
  const sorted = [...instances].sort(
    (a, b) =>
      categoryPriority(a.name) - categoryPriority(b.name) || b.width * b.length - a.width * a.length
  );

  const unplaced: string[] = [];
  const rawRows: RawInstance[][] = [];

  // Pass 1: decide which rooms fit and how they group into rows, using a row-wrapping
  // cursor — this pass only determines row membership and rejects rooms that don't
  // fit at their requested size; actual coordinates are computed in pass 2 below.
  let cursorX = buildable.x;
  let cursorY = buildable.y;
  let rowHeight = 0;

  for (const room of sorted) {
    if (room.width > buildable.width + EPSILON || room.length > buildable.height + EPSILON) {
      unplaced.push(room.name);
      continue;
    }

    if (rawRows.length === 0 || cursorX + room.width > buildable.x + buildable.width + EPSILON) {
      cursorY += rowHeight;
      cursorX = buildable.x;
      rowHeight = 0;
      rawRows.push([]);
    }

    if (cursorY + room.length > buildable.y + buildable.height + EPSILON) {
      unplaced.push(room.name);
      continue;
    }

    rawRows[rawRows.length - 1].push(room);
    cursorX += room.width;
    rowHeight = Math.max(rowHeight, room.length);
  }

  // Pass 2: stretch each row to exactly fill the buildable width, and stretch the
  // stack of rows to exactly fill the buildable height — the requested room
  // dimensions decide relative proportions and row membership, not literal final
  // footage, so the plan always uses the customer's whole plot.
  const rowNaturalHeights = rawRows.map((row) => Math.max(...row.map((r) => r.length)));
  const totalNaturalHeight = rowNaturalHeights.reduce((sum, h) => sum + h, 0);
  const verticalScale = totalNaturalHeight > 0 ? buildable.height / totalNaturalHeight : 1;

  const placed: RawPlacement[] = [];
  let rowY = buildable.y;

  rawRows.forEach((row, i) => {
    const rowNaturalWidth = row.reduce((sum, r) => sum + r.width, 0);
    const horizontalScale = buildable.width / rowNaturalWidth;
    const scaledRowHeight = rowNaturalHeights[i] * verticalScale;

    let rowX = buildable.x;
    for (const item of row) {
      const width = item.width * horizontalScale;
      const height = item.length * verticalScale;
      placed.push({ name: item.name, x: rowX, y: rowY, width, height });
      rowX += width;
    }
    rowY += scaledRowHeight;
  });

  return { placed, unplaced };
}

function transposeRect(rect: Rect): Rect {
  return { x: rect.y, y: rect.x, width: rect.height, height: rect.width };
}

function transposeInstance(instance: RawInstance): RawInstance {
  return { name: instance.name, width: instance.length, length: instance.width };
}

function transposePlacement(p: RawPlacement): RawPlacement {
  return { name: p.name, x: p.y, y: p.x, width: p.height, height: p.width };
}

function mirrorHorizontal(p: RawPlacement, buildable: Rect): RawPlacement {
  return { ...p, x: buildable.x + buildable.width - (p.x - buildable.x) - p.width };
}

/**
 * Packs rooms into the buildable rect. `variant` (see `PLAN_VARIANT_COUNT`) selects
 * one of four equally-valid arrangements of the same rooms:
 *   0 — rows fill left-to-right, top-to-bottom (the baseline arrangement)
 *   1 — "columns" fill top-to-bottom, left-to-right (rooms stack vertically first)
 *   2 — variant 0, mirrored left-right
 *   3 — variant 1, mirrored left-right
 */
function packRooms(buildable: Rect, instances: RawInstance[], variant: number) {
  const columnMajor = (variant & 1) === 1;
  const mirror = (variant & 2) === 2;

  const packBuildable = columnMajor ? transposeRect(buildable) : buildable;
  const packInstances = columnMajor ? instances.map(transposeInstance) : instances;

  const { placed: rawPlaced, unplaced } = packRowMajor(packBuildable, packInstances);

  let placed = columnMajor ? rawPlaced.map(transposePlacement) : rawPlaced;
  if (mirror) {
    placed = placed.map((p) => mirrorHorizontal(p, buildable));
  }

  const withExterior: PlacedRoom[] = placed.map((p) => ({
    ...p,
    isExterior:
      Math.abs(p.x - buildable.x) < EPSILON ||
      Math.abs(p.y - buildable.y) < EPSILON ||
      Math.abs(p.x + p.width - (buildable.x + buildable.width)) < EPSILON ||
      Math.abs(p.y + p.height - (buildable.y + buildable.height)) < EPSILON,
  }));

  return { placed: withExterior, unplaced };
}

function isOnBuildableEdge(room: PlacedRoom, buildable: Rect, direction: Direction): boolean {
  switch (direction) {
    case "North":
      return Math.abs(room.y - buildable.y) < EPSILON;
    case "South":
      return Math.abs(room.y + room.height - (buildable.y + buildable.height)) < EPSILON;
    case "West":
      return Math.abs(room.x - buildable.x) < EPSILON;
    case "East":
      return Math.abs(room.x + room.width - (buildable.x + buildable.width)) < EPSILON;
  }
}

/** Room that gets the main entrance door: prefers a public/social room touching the
 * buildable edge matching `direction`; falls back to the nearest available room on
 * that edge (with `isIdeal: false`, so the caller can warn) if none is public. */
function findEntranceIndex(
  placed: PlacedRoom[],
  buildable: Rect,
  direction: Direction | undefined
): { index: number; isIdeal: boolean } | undefined {
  if (!direction) return undefined;

  const touching = placed
    .map((room, index) => ({ room, index }))
    .filter(({ room }) => isOnBuildableEdge(room, buildable, direction));

  if (touching.length === 0) return undefined;

  const publicMatch = touching.find(({ room }) => isPublicRoom(room.name));
  if (publicMatch) return { index: publicMatch.index, isIdeal: true };

  return { index: touching[0].index, isIdeal: false };
}

function placeDoorOnEdge(room: PlacedRoom, direction: Direction): Segment {
  switch (direction) {
    case "North":
      return centeredOpening(room.x, room.y, room.x + room.width, room.y, DOOR_WIDTH);
    case "South":
      return centeredOpening(
        room.x,
        room.y + room.height,
        room.x + room.width,
        room.y + room.height,
        DOOR_WIDTH
      );
    case "West":
      return centeredOpening(room.x, room.y, room.x, room.y + room.height, DOOR_WIDTH);
    case "East":
      return centeredOpening(
        room.x + room.width,
        room.y,
        room.x + room.width,
        room.y + room.height,
        DOOR_WIDTH
      );
  }
}

function roomWalls(room: PlacedRoom): Segment[] {
  return [
    { x1: room.x, y1: room.y, x2: room.x + room.width, y2: room.y },
    { x1: room.x + room.width, y1: room.y, x2: room.x + room.width, y2: room.y + room.height },
    {
      x1: room.x + room.width,
      y1: room.y + room.height,
      x2: room.x,
      y2: room.y + room.height,
    },
    { x1: room.x, y1: room.y + room.height, x2: room.x, y2: room.y },
  ];
}

/** Centers an opening of `openingWidth` on a wall segment, clamped to fit within it. */
function centeredOpening(x1: number, y1: number, x2: number, y2: number, openingWidth: number): Segment {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const w = Math.min(openingWidth, length);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = ((x2 - x1) / length) * (w / 2);
  const dy = ((y2 - y1) / length) * (w / 2);
  return { x1: midX - dx, y1: midY - dy, x2: midX + dx, y2: midY + dy };
}

function placeDoor(room: PlacedRoom, buildable: Rect): Segment {
  // Heuristic: the door sits on whichever edge is closest to the front setback
  // line — a stand-in for real circulation-path reasoning (see module docstring).
  const distToFront = room.y - buildable.y;
  const distToRear = buildable.y + buildable.height - (room.y + room.height);
  const distToLeft = room.x - buildable.x;
  const distToRight = buildable.x + buildable.width - (room.x + room.width);

  const min = Math.min(distToFront, distToRear, distToLeft, distToRight);

  if (min === distToFront) {
    return centeredOpening(room.x, room.y, room.x + room.width, room.y, DOOR_WIDTH);
  }
  if (min === distToRear) {
    return centeredOpening(
      room.x,
      room.y + room.height,
      room.x + room.width,
      room.y + room.height,
      DOOR_WIDTH
    );
  }
  if (min === distToLeft) {
    return centeredOpening(room.x, room.y, room.x, room.y + room.height, DOOR_WIDTH);
  }
  return centeredOpening(
    room.x + room.width,
    room.y,
    room.x + room.width,
    room.y + room.height,
    DOOR_WIDTH
  );
}

function placeWindows(room: PlacedRoom, plotWidth: number, plotLength: number): Segment[] {
  const windows: Segment[] = [];
  const edges: [number, number, number, number][] = [
    [room.x, room.y, room.x + room.width, room.y], // top (front)
    [room.x + room.width, room.y, room.x + room.width, room.y + room.height], // right
    [room.x + room.width, room.y + room.height, room.x, room.y + room.height], // bottom (rear)
    [room.x, room.y + room.height, room.x, room.y], // left
  ];

  for (const [x1, y1, x2, y2] of edges) {
    const onBoundary =
      (Math.abs(x1) < EPSILON && Math.abs(x2) < EPSILON) ||
      (Math.abs(x1 - plotWidth) < EPSILON && Math.abs(x2 - plotWidth) < EPSILON) ||
      (Math.abs(y1) < EPSILON && Math.abs(y2) < EPSILON) ||
      (Math.abs(y1 - plotLength) < EPSILON && Math.abs(y2 - plotLength) < EPSILON);

    const length = Math.hypot(x2 - x1, y2 - y1);
    if (onBoundary && length >= WINDOW_WIDTH) {
      windows.push(centeredOpening(x1, y1, x2, y2, WINDOW_WIDTH));
    }
  }

  return windows;
}

export function generatePlan(input: PlanGenerationInput): PlanGenerationResult {
  const { plot, rooms } = input;
  const variant = resolveVariant(input.variant);

  const buildable: Rect = {
    x: plot.leftSetback,
    y: plot.frontSetback,
    width: plot.width - plot.leftSetback - plot.rightSetback,
    height: plot.length - plot.frontSetback - plot.rearSetback,
  };

  const warnings: string[] = [];

  if (buildable.width <= 0 || buildable.height <= 0) {
    return {
      layout: {
        plotWidth: plot.width,
        plotLength: plot.length,
        unit: plot.unit,
        buildableArea: buildable,
        rooms: [],
        walls: [],
        doors: [],
        windows: [],
        buildableAreaTotal: 0,
        usedArea: 0,
      },
      warnings: ["Setbacks leave no buildable area — reduce setbacks or increase the plot size."],
    };
  }

  const instances = expandRoomInstances(rooms);
  if (plot.floors > 1) {
    instances.push({ name: "Staircase", width: STAIRCASE_WIDTH, length: STAIRCASE_LENGTH });
  }

  const { placed, unplaced } = packRooms(buildable, instances, variant);

  if (unplaced.length > 0) {
    warnings.push(
      `${unplaced.length} room(s) didn't fit in the buildable area and were not placed: ${unplaced.join(", ")}. Reduce room sizes/count or increase the plot size.`
    );
  }

  const walls = placed.flatMap(roomWalls);
  const entrance = findEntranceIndex(placed, buildable, plot.mainDoorDirection);
  const mainDoorIndex = entrance?.index;
  const doors = placed.map((room, i) =>
    i === mainDoorIndex ? placeDoorOnEdge(room, plot.mainDoorDirection!) : placeDoor(room, buildable)
  );

  if (entrance && !entrance.isIdeal) {
    warnings.push(
      `The main entrance opens directly into "${placed[entrance.index].name}" because no living/hall room reaches the ${plot.mainDoorDirection} edge. Add a larger living area or choose a different main door direction for a more natural entrance.`
    );
  }

  const windows = placed
    .filter((room) => room.isExterior)
    .flatMap((room) => placeWindows(room, plot.width, plot.length));

  const usedArea = placed.reduce((sum, r) => sum + r.width * r.height, 0);

  return {
    layout: {
      plotWidth: plot.width,
      plotLength: plot.length,
      unit: plot.unit,
      buildableArea: buildable,
      rooms: placed,
      walls,
      doors,
      mainDoorIndex,
      windows,
      buildableAreaTotal: buildable.width * buildable.height,
      usedArea,
    },
    warnings,
  };
}
