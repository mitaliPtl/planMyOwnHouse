import type { EmailProvider, SendEmailInput } from "./email-provider.interface";

/**
 * Local-dev email provider — logs the message (including any verification/reset URL
 * embedded in the text body) to the server console instead of sending real email.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<void> {
    console.log(
      [
        "\n─── ConsoleEmailProvider ───",
        `To: ${input.to}`,
        `Subject: ${input.subject}`,
        "",
        input.text,
        "─────────────────────────────\n",
      ].join("\n")
    );
  }
}
