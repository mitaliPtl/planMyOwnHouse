"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { patchJson } from "@/lib/api-client";
import { updateProfileSchema, type UpdateProfileInput } from "@/validators/profile.validators";

interface ProfileFormProps {
  initial: {
    fullName: string;
    mobile: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    alternatePhone: string | null;
  };
}

export function ProfileForm({ initial }: ProfileFormProps) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: initial.fullName,
      mobile: initial.mobile ?? "",
      addressLine1: initial.addressLine1 ?? "",
      addressLine2: initial.addressLine2 ?? "",
      city: initial.city ?? "",
      state: initial.state ?? "",
      postalCode: initial.postalCode ?? "",
      country: initial.country ?? "",
      alternatePhone: initial.alternatePhone ?? "",
    },
  });

  async function onSubmit(values: UpdateProfileInput) {
    setIsSubmitting(true);
    setStatus("idle");

    const result = await patchJson("/api/profile", values);

    setIsSubmitting(false);
    setStatus(result.success ? "success" : "error");
    setMessage(result.message);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      {status !== "idle" && message && (
        <Alert variant={status === "error" ? "destructive" : "default"} role="alert">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
          <Input id="fullName" {...register("fullName")} />
        </FormField>
        <FormField label="Mobile" htmlFor="mobile" error={errors.mobile?.message}>
          <Input id="mobile" type="tel" {...register("mobile")} />
        </FormField>
      </div>

      <FormField label="Address line 1" htmlFor="addressLine1" error={errors.addressLine1?.message}>
        <Input id="addressLine1" {...register("addressLine1")} />
      </FormField>
      <FormField label="Address line 2" htmlFor="addressLine2" error={errors.addressLine2?.message}>
        <Input id="addressLine2" {...register("addressLine2")} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="City" htmlFor="city" error={errors.city?.message}>
          <Input id="city" {...register("city")} />
        </FormField>
        <FormField label="State" htmlFor="state" error={errors.state?.message}>
          <Input id="state" {...register("state")} />
        </FormField>
        <FormField label="Postal code" htmlFor="postalCode" error={errors.postalCode?.message}>
          <Input id="postalCode" {...register("postalCode")} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Country" htmlFor="country" error={errors.country?.message}>
          <Input id="country" {...register("country")} />
        </FormField>
        <FormField
          label="Alternate phone"
          htmlFor="alternatePhone"
          error={errors.alternatePhone?.message}
        >
          <Input id="alternatePhone" type="tel" {...register("alternatePhone")} />
        </FormField>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting && <Spinner />}
        Save changes
      </Button>
    </form>
  );
}
