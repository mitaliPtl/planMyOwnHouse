import type { Metadata } from "next";

import { SignupForm } from "@/features/auth/components/signup-form";
import { redirectIfAuthenticated } from "@/server/auth/require-auth";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage() {
  await redirectIfAuthenticated();

  return (
    <div className="grid gap-6">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-foreground">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start designing your dream home.</p>
      </div>
      <SignupForm />
    </div>
  );
}
