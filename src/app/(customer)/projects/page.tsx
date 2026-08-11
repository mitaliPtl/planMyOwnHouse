import type { Metadata } from "next";
import Link from "next/link";

import { requireAuth } from "@/server/auth/require-auth";
import { projectService } from "@/services/project.service";
import { ProjectCard } from "@/features/projects/components/project-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My Projects" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireAuth();
  const { q } = await searchParams;
  const projects = await projectService.listProjects(user.id, q);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">My Projects</h1>
          {q && (
            <p className="text-sm text-muted-foreground">
              Showing results for &quot;{q}&quot;
            </p>
          )}
        </div>
        <Button render={<Link href="/projects/new">+ Create New Plan</Link>} />
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {q ? `No projects match "${q}".` : "You haven't created a project yet."}
          </p>
          {!q && (
            <Button className="mt-4" render={<Link href="/projects/new">Create your first plan</Link>} />
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={{ ...project, updatedAt: project.updatedAt.toISOString() }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
