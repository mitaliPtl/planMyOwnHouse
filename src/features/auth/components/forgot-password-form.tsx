"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { postJson } from "@/lib/api-client";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/validators/auth.validators";

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordInput) {
    setIsSubmitting(true);
    await postJson("/api/auth/forgot-password", values);
    setIsSubmitting(false);
    // Always show the generic success state — the API itself never reveals whether
    // the email exists, and the UI shouldn't either.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Alert>
        <AlertDescription>
          If an account exists with that email, we&apos;ve sent a password reset link. Check your
          inbox.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <FormField
          label="Email"
          htmlFor="email"
          required
          description="We'll send a password reset link to this address."
          error={errors.email?.message}
        >
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </FormField>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Spinner />}
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
