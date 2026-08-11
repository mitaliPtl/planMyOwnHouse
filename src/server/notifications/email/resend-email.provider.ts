import { Resend } from "resend";

import { env } from "@/config/env";
import type { EmailProvider, SendEmailInput } from "./email-provider.interface";

export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;

  constructor() {
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
    }
    this.client = new Resend(env.RESEND_API_KEY);
  }

  async send(input: SendEmailInput): Promise<void> {
    const { error } = await this.client.emails.send({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}
