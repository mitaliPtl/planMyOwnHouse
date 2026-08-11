import { z } from "zod";

import { checkPasswordStrength } from "@/lib/password-strength";

const passwordField = z.string().min(8, "Password must be at least 8 characters long.");

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters."),
    email: z.string().trim().toLowerCase().email("Enter a valid email address."),
    mobile: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{7,15}$/, "Enter a valid mobile number.")
      .optional()
      .or(z.literal("")),
    password: passwordField,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      error: "You must accept the Terms & Conditions.",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }

    const strengthError = checkPasswordStrength(data.password, [data.fullName, data.email]);
    if (strengthError) {
      ctx.addIssue({ code: "custom", path: ["password"], message: strengthError });
    }
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === "true"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Missing reset token."),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }

    const strengthError = checkPasswordStrength(data.password);
    if (strengthError) {
      ctx.addIssue({ code: "custom", path: ["password"], message: strengthError });
    }
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
