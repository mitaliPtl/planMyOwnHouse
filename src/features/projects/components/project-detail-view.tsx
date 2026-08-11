"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Copy, Archive, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ProjectForm } from "@/features/projects/components/project-form";
import { postJson, patchJson } from "@/lib/api-client";
import type { CreateProjectInput } from "@/validators/project.validators";
import type { ProjectRecord } from "@/features/projects/types";

interface ProjectDetailViewProps {
  project: ProjectRecord;
}

const FIELD_LABELS: [keyof ProjectRecord, string][] = [
  ["description", "Description"],
  ["city", "City"],
  ["state", "State"],
  ["country", "Country"],
  ["location", "Location"],
  ["address", "Address"],
  ["notes", "Notes"],
];

export function ProjectDetailView({ project: initialProject }: ProjectDetailViewProps) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  async function handleDuplicate() {
    setIsBusy(true);
    const result = await postJson<{ id: string }>(`/api/projects/${project.id}/duplicate`, {});
    setIsBusy(false);
    if (result.success) router.push(`/projects/${result.data.id}`);
  }

  async function handleArchive() {
    if (!window.confirm(`Archive "${project.name}"? You can find it via support if you need it back.`))
      return;
    setIsBusy(true);
    await patchJson(`/api/projects/${project.id}`, { status: "ARCHIVED" });
    setIsBusy(false);
    router.push("/projects");
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    setIsBusy(true);
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    setIsBusy(false);
    router.push("/projects");
    router.refresh();
  }

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit project</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ProjectForm
            mode="edit"
            projectId={project.id}
            initial={project as Partial<CreateProjectInput>}
            onSuccess={(updated) => {
              setProject(updated);
              setIsEditing(false);
            }}
          />
          <Button variant="outline" className="w-fit" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
        <CardDescription>Project information</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          {FIELD_LABELS.filter(([key]) => project[key]).map(([key, label]) => (
            <div key={key}>
              <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
              <dd className="text-sm text-foreground">{project[key]}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} disabled={isBusy}>
            <Pencil />
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={isBusy}>
            <Copy />
            Duplicate
          </Button>
          <Button size="sm" variant="outline" onClick={handleArchive} disabled={isBusy}>
            <Archive />
            Archive
          </Button>
          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isBusy} className="ml-auto">
            <Trash2 />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
