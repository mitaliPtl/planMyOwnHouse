"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Trash2, ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/api-client";

export interface ProjectCardData {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  state: string | null;
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
  updatedAt: string;
}

const STATUS_LABEL: Record<ProjectCardData["status"], string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

const STATUS_CLASS: Record<ProjectCardData["status"], string> = {
  DRAFT: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-primary/10 text-primary",
  COMPLETED: "bg-green-500/10 text-green-700 dark:text-green-400",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);

  const location = [project.city, project.state].filter(Boolean).join(", ");
  const updated = new Date(project.updatedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  async function handleDuplicate() {
    setIsBusy(true);
    await postJson(`/api/projects/${project.id}/duplicate`, {});
    setIsBusy(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    setIsBusy(true);
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    setIsBusy(false);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="grid gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/projects/${project.id}`} className="font-semibold text-foreground hover:underline">
              {project.name}
            </Link>
            {location && <p className="text-sm text-muted-foreground">{location}</p>}
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[project.status]}`}
          >
            {STATUS_LABEL[project.status]}
          </span>
        </div>

        {project.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
        )}

        <p className="text-xs text-muted-foreground">Last updated {updated}</p>

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" render={<Link href={`/projects/${project.id}`}>Continue<ArrowRight /></Link>} />
          <Button size="sm" variant="outline" disabled={isBusy} onClick={handleDuplicate}>
            <Copy />
            Duplicate
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={isBusy}
            onClick={handleDelete}
            className="ml-auto"
          >
            <Trash2 />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
