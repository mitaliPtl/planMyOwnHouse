import type { Metadata } from "next";

import { ProjectForm } from "@/features/projects/components/project-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Create New Plan" };

export default function NewProjectPage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Create New Plan</h1>
        <p className="text-sm text-muted-foreground">
          Start with the basics — you can fill in plot and room details in the next steps.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project information</CardTitle>
          <CardDescription>This becomes the name and details for your new project.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
