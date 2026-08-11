export function resetPasswordTemplate(input: { fullName: string; resetUrl: string }) {
  const subject = "Reset your planMyOwnHouse password";
  const text = `Hi ${input.fullName},\n\nWe received a request to reset your password. Visit the link below to choose a new one:\n\n${input.resetUrl}\n\nThis link expires in 1 hour and can only be used once. If you didn't request this, you can ignore this email — your password will not change.\n\n— planMyOwnHouse`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0F2747;">Reset your password</h2>
      <p>Hi ${input.fullName},</p>
      <p>We received a request to reset your planMyOwnHouse password.</p>
      <p style="margin: 24px 0;">
        <a href="${input.resetUrl}" style="background:#2563EB;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Reset password</a>
      </p>
      <p style="color:#64748B;font-size:13px;">This link expires in 1 hour and can only be used once. If you didn't request this, you can ignore this email.</p>
    </div>
  `;
  return { subject, text, html };
}
