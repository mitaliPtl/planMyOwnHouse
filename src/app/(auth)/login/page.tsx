import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";
import { redirectIfAuthenticated } from "@/server/auth/require-auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <div className="grid gap-6">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Log in to continue designing your home.</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
