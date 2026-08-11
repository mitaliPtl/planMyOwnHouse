export type Direction = "North" | "South" | "East" | "West";

export interface PlanGenerationPlotInput {
  width: number;
  length: number;
  unit: "FEET" | "METER" | "YARD";
  floors: number;
  frontSetback: number;
  rearSetback: number;
  leftSetback: number;
  rightSetback: number;
  mainDoorDirection?: Direction;
}

export interface PlanGenerationRoomInput {
  roomTypeName: string;
  width: number;
  length: number;
  quantity: number;
}

export interface PlanGenerationInput {
  plot: PlanGenerationPlotInput;
  rooms: PlanGenerationRoomInput[];
  /** Selects one of a small set of equally-valid layout arrangements (see
   * plan-generation-engine.ts) so regenerating a plan yields a different result. */
  variant?: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PlacedRoom {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isExterior: boolean;
}

export interface PlanLayout {
  plotWidth: number;
  plotLength: number;
  unit: PlanGenerationPlotInput["unit"];
  buildableArea: Rect;
  rooms: PlacedRoom[];
  walls: Segment[];
  doors: Segment[];
  /** Index into `rooms`/`doors` for the entrance matching the plot's main door
   * direction, if one was selected and reachable. Undefined otherwise. */
  mainDoorIndex?: number;
  windows: Segment[];
  buildableAreaTotal: number;
  usedArea: number;
}

export interface PlanGenerationResult {
  layout: PlanLayout;
  warnings: string[];
}
