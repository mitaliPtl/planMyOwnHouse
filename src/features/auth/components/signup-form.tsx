"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { postJson } from "@/lib/api-client";
import { signupSchema, type SignupInput } from "@/validators/auth.validators";

export function SignupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { acceptTerms: false as unknown as true },
  });

  async function onSubmit(values: SignupInput) {
    setFormError(null);
    setIsSubmitting(true);

    const result = await postJson("/api/auth/signup", values);

    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.message);
      return;
    }

    router.push("/login?verified=pending");
  }

  return (
    <div className="grid gap-4">
      {formError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <FormField label="Full name" htmlFor="fullName" required error={errors.fullName?.message}>
          <Input id="fullName" autoComplete="name" {...register("fullName")} />
        </FormField>

        <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </FormField>

        <FormField
          label="Mobile number"
          htmlFor="mobile"
          description="Optional"
          error={errors.mobile?.message}
        >
          <Input id="mobile" type="tel" autoComplete="tel" {...register("mobile")} />
        </FormField>

        <FormField label="Password" htmlFor="password" required error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        </FormField>

        <FormField
          label="Confirm password"
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

        <Controller
          name="acceptTerms"
          control={control}
          render={({ field }) => (
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={field.value === true}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                className="mt-0.5"
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms & Conditions
                </Link>
              </span>
            </label>
          )}
        />
        {errors.acceptTerms && (
          <p role="alert" className="-mt-2 text-xs font-medium text-destructive">
            {errors.acceptTerms.message}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Spinner />}
          Create account
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isSubmitting}
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          Sign up with Google
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
