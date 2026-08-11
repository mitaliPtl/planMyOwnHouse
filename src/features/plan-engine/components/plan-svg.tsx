"use client";

import type { PlanLayout, Segment } from "@/server/plan-engine/types";

interface PlanSvgProps {
  layout: PlanLayout;
  showDimensions: boolean;
}

function doorSwingPath(door: Segment) {
  const dx = door.x2 - door.x1;
  const dy = door.y2 - door.y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return "";
  // Perpendicular direction (rotate 90° CCW) — a simple, illustrative swing arc, not
  // a real hinge-side computation (see plan-generation-engine.ts docstring).
  const px = -dy;
  const py = dx;
  const swingX = door.x1 + px;
  const swingY = door.y1 + py;
  return `M ${door.x2} ${door.y2} A ${len} ${len} 0 0 1 ${swingX} ${swingY} L ${door.x1} ${door.y1} Z`;
}

const WALL_THICKNESS_RATIO = 0.006;
const MAIN_DOOR_COLOR = "#16A34A"; // matches the plot preview's main-door marker

const UNIT_LABEL: Record<PlanLayout["unit"], string> = {
  FEET: "ft",
  METER: "m",
  YARD: "yd",
};

export function PlanSvg({ layout, showDimensions }: PlanSvgProps) {
  const padding = Math.max(layout.plotWidth, layout.plotLength) * 0.12;
  const viewWidth = layout.plotWidth + padding * 2;
  const viewHeight = layout.plotLength + padding * 2;
  const offsetX = padding;
  const offsetY = padding;
  const wallThickness = Math.max(layout.plotWidth, layout.plotLength) * WALL_THICKNESS_RATIO;
  const unitLabel = UNIT_LABEL[layout.unit];

  // Compass labels on all four sides — "up" on screen is always North, by the same
  // convention used in the plot preview (see plot-visualization.tsx), so width runs
  // East-West and length runs North-South.
  const compassLabels: { direction: "N" | "S" | "E" | "W"; x: number; y: number }[] = [
    { direction: "N", x: layout.plotWidth / 2, y: -padding * 0.55 },
    { direction: "S", x: layout.plotWidth / 2, y: layout.plotLength + padding * 0.55 },
    { direction: "W", x: -padding * 0.55, y: layout.plotLength / 2 },
    { direction: "E", x: layout.plotWidth + padding * 0.55, y: layout.plotLength / 2 },
  ];

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="h-auto w-full"
      role="img"
      aria-label={`2D floor plan, ${layout.plotWidth} by ${layout.plotLength} ${unitLabel}, north is up`}
    >
      <g transform={`translate(${offsetX}, ${offsetY})`}>
        {/* Plot boundary */}
        <rect
          x={0}
          y={0}
          width={layout.plotWidth}
          height={layout.plotLength}
          fill="var(--color-background)"
          stroke="var(--color-border)"
          strokeWidth={wallThickness * 0.5}
        />

        {/* Compass labels — clarifies which way plot width/length run */}
        {compassLabels.map((c) => (
          <text
            key={c.direction}
            x={c.x}
            y={c.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={padding * 0.24}
            fontWeight={600}
            fill="var(--color-navy)"
          >
            {c.direction}
          </text>
        ))}

        {showDimensions && (
          <>
            {/* Overall plot width (top) */}
            <text
              x={layout.plotWidth / 2}
              y={-padding * 0.2}
              textAnchor="middle"
              fontSize={padding * 0.2}
              fill="var(--color-foreground)"
            >
              {layout.plotWidth} {unitLabel}
            </text>

            {/* Overall plot length (right, rotated) */}
            <text
              x={layout.plotWidth + padding * 0.2}
              y={layout.plotLength / 2}
              textAnchor="middle"
              fontSize={padding * 0.2}
              fill="var(--color-foreground)"
              transform={`rotate(90 ${layout.plotWidth + padding * 0.2} ${layout.plotLength / 2})`}
            >
              {layout.plotLength} {unitLabel}
            </text>
          </>
        )}

        {/* Room fills + labels */}
        {layout.rooms.map((room) => (
          <g key={`${room.name}-${room.x}-${room.y}`}>
            <rect
              x={room.x}
              y={room.y}
              width={room.width}
              height={room.height}
              fill="var(--color-primary)"
              fillOpacity={room.name === "Staircase" ? 0.15 : 0.06}
            />
            <text
              x={room.x + room.width / 2}
              y={room.y + room.height / 2 - (showDimensions ? padding * 0.12 : 0)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={padding * 0.22}
              fill="var(--color-foreground)"
            >
              {room.name}
            </text>
            {showDimensions && (
              <text
                x={room.x + room.width / 2}
                y={room.y + room.height / 2 + padding * 0.16}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={padding * 0.16}
                fill="var(--color-muted-foreground)"
              >
                {room.width}×{room.height}
              </text>
            )}
          </g>
        ))}

        {/* Walls (each room's own edges) */}
        {layout.walls.map((wall, i) => (
          <line
            key={i}
            x1={wall.x1}
            y1={wall.y1}
            x2={wall.x2}
            y2={wall.y2}
            stroke="var(--color-navy)"
            strokeWidth={wallThickness}
            strokeLinecap="square"
          />
        ))}

        {/* Door openings: a gap in the wall + a simple swing arc. The main entrance
            (if a main door direction was set on the plot) is highlighted and labeled. */}
        {layout.doors.map((door, i) => {
          const isMainDoor = i === layout.mainDoorIndex;
          const color = isMainDoor ? MAIN_DOOR_COLOR : "var(--color-primary)";
          return (
            <g key={i}>
              <line
                x1={door.x1}
                y1={door.y1}
                x2={door.x2}
                y2={door.y2}
                stroke="var(--color-background)"
                strokeWidth={wallThickness * (isMainDoor ? 2 : 1.4)}
              />
              <path
                d={doorSwingPath(door)}
                fill={color}
                fillOpacity={isMainDoor ? 0.15 : 0.08}
                stroke={color}
                strokeWidth={wallThickness * (isMainDoor ? 0.5 : 0.3)}
              />
              {isMainDoor && (
                <text
                  x={(door.x1 + door.x2) / 2}
                  y={(door.y1 + door.y2) / 2 - padding * 0.16}
                  textAnchor="middle"
                  fontSize={padding * 0.16}
                  fontWeight={600}
                  fill={MAIN_DOOR_COLOR}
                >
                  Main Entrance
                </text>
              )}
            </g>
          );
        })}

        {/* Windows: highlighted segment on exterior walls */}
        {layout.windows.map((win, i) => (
          <line
            key={i}
            x1={win.x1}
            y1={win.y1}
            x2={win.x2}
            y2={win.y2}
            stroke="var(--color-primary)"
            strokeWidth={wallThickness * 0.8}
          />
        ))}
      </g>
    </svg>
  );
}
