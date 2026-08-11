"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { postJson } from "@/lib/api-client";

const clientResetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters long."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ClientResetInput = z.infer<typeof clientResetSchema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientResetInput>({ resolver: zodResolver(clientResetSchema) });

  async function onSubmit(values: ClientResetInput) {
    setFormError(null);
    setIsSubmitting(true);

    const result = await postJson("/api/auth/reset-password", { token, ...values });

    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.message);
      return;
    }

    router.push("/login?reset=success");
  }

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertDescription>This reset link is missing its token. Request a new one.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4">
      {formError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <FormField label="New password" htmlFor="password" required error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        </FormField>

        <FormField
          label="Confirm new password"
          htmlFor="confirmPassword"
          required
          error={errors.confirmPassword?.message}
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
        </FormField>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Spinner />}
          Reset password
        </Button>
      </form>
    </div>
  );
}
