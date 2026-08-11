"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { postJson, patchJson } from "@/lib/api-client";
import { createProjectSchema, type CreateProjectInput } from "@/validators/project.validators";
import type { ProjectRecord } from "@/features/projects/types";

interface ProjectFormProps {
  mode: "create" | "edit";
  projectId?: string;
  initial?: Partial<CreateProjectInput>;
  /**
   * Edit mode: called with the updated project instead of navigating. Editing happens
   * on /projects/[id] itself, so router.push to that same URL is a no-op in the App
   * Router — the parent's "which view am I in" state would never flip back to
   * read-only. Create mode ignores this and always navigates to the new project.
   */
  onSuccess?: (project: ProjectRecord) => void;
}

export function ProjectForm({ mode, projectId, initial, onSuccess }: ProjectFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      location: initial?.location ?? "",
      state: initial?.state ?? "",
      city: initial?.city ?? "",
      country: initial?.country ?? "",
      address: initial?.address ?? "",
      notes: initial?.notes ?? "",
    },
  });

  async function onSubmit(values: CreateProjectInput) {
    setFormError(null);
    setIsSubmitting(true);

    const result =
      mode === "create"
        ? await postJson<ProjectRecord>("/api/projects", values)
        : await patchJson<ProjectRecord>(`/api/projects/${projectId}`, values);

    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.message);
      return;
    }

    if (mode === "edit" && onSuccess) {
      onSuccess(result.data);
      return;
    }

    router.push(`/projects/${result.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      {formError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <FormField label="Project name" htmlFor="name" required error={errors.name?.message}>
        <Input id="name" placeholder="e.g. My Dream Home" {...register("name")} />
      </FormField>

      <FormField label="Description" htmlFor="description" error={errors.description?.message}>
        <Input id="description" {...register("description")} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="City" htmlFor="city" error={errors.city?.message}>
          <Input id="city" {...register("city")} />
        </FormField>
        <FormField label="State" htmlFor="state" error={errors.state?.message}>
          <Input id="state" {...register("state")} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Country" htmlFor="country" error={errors.country?.message}>
          <Input id="country" {...register("country")} />
        </FormField>
        <FormField label="Location" htmlFor="location" error={errors.location?.message}>
          <Input id="location" placeholder="Neighbourhood / area" {...register("location")} />
        </FormField>
      </div>

      <FormField label="Address" htmlFor="address" error={errors.address?.message}>
        <Input id="address" {...register("address")} />
      </FormField>

      <FormField label="Notes" htmlFor="notes" error={errors.notes?.message}>
        <Input id="notes" {...register("notes")} />
      </FormField>

      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting && <Spinner />}
        {mode === "create" ? "Create project" : "Save changes"}
      </Button>
    </form>
  );
}
