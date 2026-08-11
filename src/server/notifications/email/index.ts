import { env } from "@/config/env";
import type { EmailProvider } from "./email-provider.interface";
import { ConsoleEmailProvider } from "./console-email.provider";
import { ResendEmailProvider } from "./resend-email.provider";

let cached: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (!cached) {
    cached = env.EMAIL_PROVIDER === "resend" ? new ResendEmailProvider() : new ConsoleEmailProvider();
  }
  return cached;
}

export type { EmailProvider, SendEmailInput } from "./email-provider.interface";
