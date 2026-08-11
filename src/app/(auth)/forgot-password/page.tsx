import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { redirectIfAuthenticated } from "@/server/auth/require-auth";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();

  return (
    <div className="grid gap-6">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-foreground">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
