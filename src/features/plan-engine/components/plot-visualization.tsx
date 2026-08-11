"use client";

type Direction = "North" | "South" | "East" | "West";

interface PlotVisualizationProps {
  width: number;
  length: number;
  frontSetback: number;
  rearSetback: number;
  leftSetback: number;
  rightSetback: number;
  roadSide?: Direction;
  mainDoorDirection?: Direction;
  unit: "FEET" | "METER" | "YARD";
}

const UNIT_LABEL: Record<PlotVisualizationProps["unit"], string> = {
  FEET: "ft",
  METER: "m",
  YARD: "yd",
};

const MAIN_DOOR_COLOR = "#16A34A"; // distinct accent, used only for this marker

/**
 * Read-only plot preview — plot boundary, setback lines (dashed), a road indicator on
 * the chosen edge, a main-door marker on the chosen edge, compass labels on all four
 * sides, and dimension labels. Purely illustrative: directions here just mark which
 * edge the customer says is which way — they aren't derived from any real
 * geolocation. By convention "up" on screen is always North, so width (the top/bottom
 * dimension) runs East–West and length (the left/right dimension) runs North–South.
 */
export function PlotVisualization({
  width,
  length,
  frontSetback,
  rearSetback,
  leftSetback,
  rightSetback,
  roadSide,
  mainDoorDirection,
  unit,
}: PlotVisualizationProps) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const safeLength = Number.isFinite(length) && length > 0 ? length : 1;

  const padding = Math.max(safeWidth, safeLength) * 0.22;
  const viewWidth = safeWidth + padding * 2;
  const viewHeight = safeLength + padding * 2;

  const plotX = padding;
  const plotY = padding;

  const bx = plotX + Math.min(leftSetback, safeWidth / 2 - 0.1);
  const by = plotY + Math.min(frontSetback, safeLength / 2 - 0.1);
  const bw = Math.max(safeWidth - leftSetback - rightSetback, 0.1);
  const bh = Math.max(safeLength - frontSetback - rearSetback, 0.1);

  const unitLabel = UNIT_LABEL[unit];
  const strokeWidth = Math.max(safeWidth, safeLength) * 0.006;

  const roadBand = (() => {
    const thickness = padding * 0.35;
    switch (roadSide) {
      case "North":
        return { x: plotX, y: plotY - thickness, width: safeWidth, height: thickness };
      case "South":
        return { x: plotX, y: plotY + safeLength, width: safeWidth, height: thickness };
      case "West":
        return { x: plotX - thickness, y: plotY, width: thickness, height: safeLength };
      case "East":
        return { x: plotX + safeWidth, y: plotY, width: thickness, height: safeLength };
      default:
        return null;
    }
  })();

  // Compass labels sit at the outer edge of the padding ring, well clear of the
  // dimension labels (which sit close to the boundary) and the road band.
  const compassLabels: { direction: Direction; x: number; y: number }[] = [
    { direction: "North", x: plotX + safeWidth / 2, y: padding * 0.22 },
    { direction: "South", x: plotX + safeWidth / 2, y: viewHeight - padding * 0.12 },
    { direction: "West", x: padding * 0.22, y: plotY + safeLength / 2 },
    { direction: "East", x: viewWidth - padding * 0.22, y: plotY + safeLength / 2 },
  ];

  // Main door marker: a gap in the boundary line plus a swing arc into the plot,
  // centered on the chosen edge — the same visual language the generated 2D plan
  // uses for doors (see plan-svg.tsx), so this preview foreshadows the real output.
  const doorMarker = (() => {
    const doorWidth = Math.min(Math.max(safeWidth, safeLength) * 0.08, 4);
    switch (mainDoorDirection) {
      case "North":
        return {
          x1: plotX + safeWidth / 2 - doorWidth / 2,
          y1: plotY,
          x2: plotX + safeWidth / 2 + doorWidth / 2,
          y2: plotY,
          labelX: plotX + safeWidth / 2,
          labelY: plotY - padding * 0.35,
        };
      case "South":
        return {
          x1: plotX + safeWidth / 2 - doorWidth / 2,
          y1: plotY + safeLength,
          x2: plotX + safeWidth / 2 + doorWidth / 2,
          y2: plotY + safeLength,
          labelX: plotX + safeWidth / 2,
          labelY: plotY + safeLength + padding * 0.45,
        };
      case "West":
        return {
          x1: plotX,
          y1: plotY + safeLength / 2 - doorWidth / 2,
          x2: plotX,
          y2: plotY + safeLength / 2 + doorWidth / 2,
          labelX: plotX - padding * 0.35,
          labelY: plotY + safeLength / 2 + padding * 0.4,
        };
      case "East":
        return {
          x1: plotX + safeWidth,
          y1: plotY + safeLength / 2 - doorWidth / 2,
          x2: plotX + safeWidth,
          y2: plotY + safeLength / 2 + doorWidth / 2,
          labelX: plotX + safeWidth + padding * 0.35,
          labelY: plotY + safeLength / 2 + padding * 0.4,
        };
      default:
        return null;
    }
  })();

  function doorSwingPath(x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const px = -dy;
    const py = dx;
    return `M ${x2} ${y2} A ${len} ${len} 0 0 1 ${x1 + px} ${y1 + py} L ${x1} ${y1} Z`;
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        className="mx-auto h-auto w-full max-w-md"
        role="img"
        aria-label={`Plot ${safeWidth} by ${safeLength} ${unitLabel}, buildable area after setbacks${roadSide ? `, road on the ${roadSide} side` : ""}${mainDoorDirection ? `, main door facing ${mainDoorDirection}` : ""}`}
      >
        {roadBand && (
          <>
            <rect
              x={roadBand.x}
              y={roadBand.y}
              width={roadBand.width}
              height={roadBand.height}
              fill="var(--color-muted-foreground)"
              opacity={0.15}
            />
            <text
              x={roadBand.x + roadBand.width / 2}
              y={roadBand.y + roadBand.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={padding * 0.22}
              fill="var(--color-muted-foreground)"
            >
              Road
            </text>
          </>
        )}

        {/* Plot boundary */}
        <rect
          x={plotX}
          y={plotY}
          width={safeWidth}
          height={safeLength}
          fill="var(--color-card)"
          stroke="var(--color-navy)"
          strokeWidth={strokeWidth}
        />

        {/* Buildable area (after setbacks) */}
        <rect
          x={bx}
          y={by}
          width={bw}
          height={bh}
          fill="var(--color-primary)"
          fillOpacity={0.06}
          stroke="var(--color-primary)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${strokeWidth * 3} ${strokeWidth * 2}`}
        />

        {/* Compass labels on all four sides — clarifies which way width/length run */}
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
            {c.direction[0]}
          </text>
        ))}

        {/* Width dimension (top) */}
        <text
          x={plotX + safeWidth / 2}
          y={plotY - padding * 0.22}
          textAnchor="middle"
          fontSize={padding * 0.24}
          fill="var(--color-foreground)"
        >
          {safeWidth} {unitLabel}
        </text>

        {/* Length dimension (left, rotated) */}
        <text
          x={plotX - padding * 0.22}
          y={plotY + safeLength / 2}
          textAnchor="middle"
          fontSize={padding * 0.24}
          fill="var(--color-foreground)"
          transform={`rotate(-90 ${plotX - padding * 0.22} ${plotY + safeLength / 2})`}
        >
          {safeLength} {unitLabel}
        </text>

        {/* Main door marker: gap in the wall + swing arc, on the chosen edge */}
        {doorMarker && (
          <g>
            <line
              x1={doorMarker.x1}
              y1={doorMarker.y1}
              x2={doorMarker.x2}
              y2={doorMarker.y2}
              stroke={MAIN_DOOR_COLOR}
              strokeWidth={strokeWidth * 2.5}
            />
            <path
              d={doorSwingPath(doorMarker.x1, doorMarker.y1, doorMarker.x2, doorMarker.y2)}
              fill={MAIN_DOOR_COLOR}
              fillOpacity={0.12}
              stroke={MAIN_DOOR_COLOR}
              strokeWidth={strokeWidth * 0.4}
            />
            <text
              x={doorMarker.labelX}
              y={doorMarker.labelY}
              textAnchor="middle"
              fontSize={padding * 0.18}
              fill={MAIN_DOOR_COLOR}
              fontWeight={600}
            >
              Main Door
            </text>
          </g>
        )}
      </svg>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Solid line: plot boundary</span>
        <span>Dashed line: buildable area</span>
        {mainDoorDirection && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-3" style={{ backgroundColor: MAIN_DOOR_COLOR }} />
            Main door
          </span>
        )}
      </div>
    </div>
  );
}
