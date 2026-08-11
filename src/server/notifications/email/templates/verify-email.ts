export function verifyEmailTemplate(input: { fullName: string; verifyUrl: string }) {
  const subject = "Verify your planMyOwnHouse account";
  const text = `Hi ${input.fullName},\n\nWelcome to planMyOwnHouse. Please verify your email address by visiting the link below:\n\n${input.verifyUrl}\n\nThis link expires in 24 hours. If you didn't create this account, you can ignore this email.\n\n— planMyOwnHouse`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0F2747;">Welcome to planMyOwnHouse</h2>
      <p>Hi ${input.fullName},</p>
      <p>Please verify your email address to activate your account.</p>
      <p style="margin: 24px 0;">
        <a href="${input.verifyUrl}" style="background:#2563EB;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Verify email</a>
      </p>
      <p style="color:#64748B;font-size:13px;">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
    </div>
  `;
  return { subject, text, html };
}
