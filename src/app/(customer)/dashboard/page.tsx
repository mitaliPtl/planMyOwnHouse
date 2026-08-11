import type { Metadata } from "next";
import Link from "next/link";

import { requireAuth } from "@/server/auth/require-auth";
import { projectService } from "@/services/project.service";
import { StatsCards } from "@/features/dashboard/components/stats-cards";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { ProjectCard } from "@/features/projects/components/project-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireAuth();
  const [stats, projects] = await Promise.all([
    projectService.getDashboardStats(user.id),
    projectService.listProjects(user.id),
  ]);

  const recentProjects = projects.slice(0, 3);

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Welcome back, {user.fullName}!</h1>
          <p className="text-sm text-muted-foreground">Design your next home.</p>
        </div>
        <Button render={<Link href="/projects/new">+ Create New Plan</Link>} />
      </div>

      <StatsCards stats={stats} />

      <section className="grid gap-4">
        <h2 className="text-lg font-semibold text-foreground">Quick actions</h2>
        <QuickActions />
      </section>

      <section className="grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent projects</h2>
          {projects.length > 0 && (
            <Link href="/projects" className="text-sm text-primary hover:underline">
              View all
            </Link>
          )}
        </div>

        {recentProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              You haven&apos;t created a project yet.
            </p>
            <Button className="mt-4" render={<Link href="/projects/new">Create your first plan</Link>} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={{
                  ...project,
                  updatedAt: project.updatedAt.toISOString(),
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
