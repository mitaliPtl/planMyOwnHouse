"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  Ruler,
  Download,
  Printer,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { PlanSvg } from "@/features/plan-engine/components/plan-svg";
import { postJson } from "@/lib/api-client";
import type { PlanLayout } from "@/server/plan-engine/types";

interface PlanViewerProps {
  projectId: string;
  initialPlan: { version: number; layoutData: PlanLayout; warnings: string[] } | null;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

export function PlanViewer({ projectId, initialPlan }: PlanViewerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);

  const [plan, setPlan] = useState(initialPlan);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [showDimensions, setShowDimensions] = useState(true);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null
  );

  function resetView() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function zoomBy(factor: number) {
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * factor)));
  }

  function onPointerDown(e: React.PointerEvent) {
    dragState.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset({ x: dragState.current.originX + dx, y: dragState.current.originY + dy });
  }

  function onPointerUp() {
    dragState.current = null;
    setIsDragging(false);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }

  function downloadSvg() {
    const svg = svgWrapperRef.current?.querySelector("svg");
    if (!svg) return;

    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`], {
      type: "image/svg+xml",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `floor-plan-v${plan?.version ?? 1}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setGenerateError(null);

    const result = await postJson<{ plan: { version: number; layoutData: PlanLayout }; warnings: string[] }>(
      `/api/projects/${projectId}/plan/generate`,
      {}
    );

    setIsGenerating(false);

    if (!result.success) {
      setGenerateError(result.message);
      return;
    }

    setPlan({
      version: result.data.plan.version,
      layoutData: result.data.plan.layoutData,
      warnings: result.data.warnings,
    });
    resetView();
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      {generateError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{generateError}</AlertDescription>
        </Alert>
      )}

      {plan && plan.warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-inside list-disc">
              {plan.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating && <Spinner />}
          <RefreshCw />
          {plan ? "Regenerate plan" : "Generate 2D plan"}
        </Button>

        {plan && (
          <>
            <Button variant="outline" size="icon-sm" onClick={() => zoomBy(1.2)} aria-label="Zoom in">
              <ZoomIn />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out">
              <ZoomOut />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={resetView} aria-label="Reset view">
              <RotateCcw />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setShowDimensions((v) => !v)}
              aria-label="Toggle dimensions"
              aria-pressed={showDimensions}
            >
              <Ruler />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={toggleFullscreen} aria-label="Fullscreen">
              <Maximize />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={downloadSvg} aria-label="Download SVG">
              <Download />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => window.print()} aria-label="Print">
              <Printer />
            </Button>
          </>
        )}
      </div>

      {plan ? (
        <div
          ref={containerRef}
          className="overflow-hidden rounded-xl border border-border bg-muted/20 print:border-0"
          style={{ touchAction: "none" }}
        >
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            className="flex h-[520px] cursor-grab items-center justify-center active:cursor-grabbing"
          >
            <div
              ref={svgWrapperRef}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transition: isDragging ? "none" : "transform 0.1s ease-out",
              }}
              className="w-full max-w-2xl px-8"
            >
              <PlanSvg layout={plan.layoutData} showDimensions={showDimensions} />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No plan generated yet. Make sure plot details and rooms are saved, then
            generate your 2D plan.
          </p>
        </div>
      )}

      {plan && (
        <p className="text-xs text-muted-foreground">Plan version {plan.version}. Drag to pan, use the controls to zoom.</p>
      )}
    </div>
  );
}
