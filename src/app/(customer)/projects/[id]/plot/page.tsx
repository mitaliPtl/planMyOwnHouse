import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireAuth } from "@/server/auth/require-auth";
import { plotService } from "@/services/plot.service";
import { PlotForm } from "@/features/plan-engine/components/plot-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NotFoundError } from "@/lib/errors";

export const metadata: Metadata = { title: "Plot Details" };

export default async function PlotDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  let plot;
  try {
    plot = await plotService.getPlot(user.id, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

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
        <h1 className="text-2xl font-bold text-navy">Plot Details</h1>
        <p className="text-sm text-muted-foreground">
          Enter your plot dimensions and setbacks — this defines the buildable area for
          your plan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plot information</CardTitle>
          <CardDescription>All dimensions use the same unit.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlotForm
            projectId={id}
            initial={
              plot
                ? {
                    width: plot.width,
                    length: plot.length,
                    unit: plot.unit,
                    floors: plot.floors,
                    roadSide: plot.roadSide as "North" | "South" | "East" | "West" | undefined,
                    mainDoorDirection: plot.mainDoorDirection as
                      | "North"
                      | "South"
                      | "East"
                      | "West"
                      | undefined,
                    frontSetback: plot.frontSetback,
                    rearSetback: plot.rearSetback,
                    leftSetback: plot.leftSetback,
                    rightSetback: plot.rightSetback,
                  }
                : undefined
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
