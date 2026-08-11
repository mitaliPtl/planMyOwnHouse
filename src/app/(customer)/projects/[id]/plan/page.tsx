import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireAuth } from "@/server/auth/require-auth";
import { planService } from "@/services/plan.service";
import { PlanViewer } from "@/features/plan-engine/components/plan-viewer";
import { NotFoundError } from "@/lib/errors";
import type { PlanLayout } from "@/server/plan-engine/types";

export const metadata: Metadata = { title: "2D Plan" };

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  let plan;
  try {
    plan = await planService.getLatestPlan(user.id, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <Link
        href={`/projects/${id}`}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to project
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-navy">2D Floor Plan</h1>
        <p className="text-sm text-muted-foreground">
          Generated automatically from your plot and room selections using a basic
          layout engine — not an architecturally-optimized design. See the workflow
          panel on the project page for what&apos;s next.
        </p>
      </div>

      <PlanViewer
        projectId={id}
        initialPlan={
          plan
            ? {
                version: plan.version,
                layoutData: plan.layoutData as unknown as PlanLayout,
                warnings: (plan.warnings as unknown as string[]) ?? [],
              }
            : null
        }
      />
    </div>
  );
}
