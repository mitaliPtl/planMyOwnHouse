import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

import { requireAuth } from "@/server/auth/require-auth";
import { projectService } from "@/services/project.service";
import { plotService } from "@/services/plot.service";
import { roomService } from "@/services/room.service";
import { planService } from "@/services/plan.service";
import { ProjectDetailView } from "@/features/projects/components/project-detail-view";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NotFoundError } from "@/lib/errors";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  let project;
  try {
    project = await projectService.getProject(user.id, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const [plot, rooms, plan] = await Promise.all([
    plotService.getPlot(user.id, id),
    roomService.listProjectRooms(user.id, id),
    planService.getLatestPlan(user.id, id),
  ]);

  const steps = [
    { label: "Project Information", href: null, done: true },
    { label: "Plot Details", href: `/projects/${id}/plot`, done: Boolean(plot) },
    // Combines the spec's separate "Requirements" and "Room Settings" steps — see
    // docs/roadmap.md for the rationale.
    { label: "Requirements & Room Settings", href: `/projects/${id}/rooms`, done: rooms.length > 0 },
    { label: "2D Plan", href: `/projects/${id}/plan`, done: Boolean(plan) },
    { label: "3D View", href: null, done: false },
    { label: "Elevation", href: null, done: false },
    { label: "Estimation", href: null, done: false },
  ];

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <ProjectDetailView project={project} />

      <Card>
        <CardHeader>
          <CardTitle>Design workflow</CardTitle>
          <CardDescription>
            3D view through estimation are being built next — plot, rooms, and 2D plan
            are ready now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-1">
            {steps.map((step) => {
              const content = (
                <>
                  {step.done ? (
                    <CheckCircle2 className="size-4 text-primary" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground/40" />
                  )}
                  <span className={step.done ? "text-foreground" : "text-muted-foreground"}>
                    {step.label}
                  </span>
                  {step.href ? (
                    <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
                  ) : (
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Soon
                    </span>
                  )}
                </>
              );

              return (
                <li key={step.label}>
                  {step.href ? (
                    <Link
                      href={step.href}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 px-2 py-1.5 text-sm">{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
