import type { Metadata } from "next";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="grid gap-6">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-foreground">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">Enter and confirm your new password below.</p>
      </div>
      <ResetPasswordForm token={token ?? ""} />
    </div>
  );
}
