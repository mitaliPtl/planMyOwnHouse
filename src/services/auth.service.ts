import "server-only";

import { userRepository } from "@/repositories/user.repository";
import { verificationTokenRepository } from "@/repositories/verification-token.repository";
import { passwordResetTokenRepository } from "@/repositories/password-reset-token.repository";
import { hashPassword } from "@/server/auth/password";
import { generateToken, hashToken } from "@/server/auth/tokens";
import { getEmailProvider } from "@/server/notifications/email";
import { verifyEmailTemplate } from "@/server/notifications/email/templates/verify-email";
import { resetPasswordTemplate } from "@/server/notifications/email/templates/reset-password";
import { auditLogService } from "@/services/audit-log.service";
import { AppError } from "@/lib/errors";
import { env } from "@/config/env";
import type { SignupInput } from "@/validators/auth.validators";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function appUrl(path: string) {
  return `${env.AUTH_URL ?? "http://localhost:3000"}${path}`;
}

async function sendVerificationEmail(user: { email: string; fullName: string }) {
  const { raw, hash } = generateToken();
  await verificationTokenRepository.create(
    user.email,
    hash,
    new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS)
  );

  const verifyUrl = appUrl(`/api/auth/verify-email?token=${raw}`);
  const { subject, text, html } = verifyEmailTemplate({ fullName: user.fullName, verifyUrl });
  await getEmailProvider().send({ to: user.email, subject, text, html });
}

export const authService = {
  async signup(input: SignupInput, request?: Request) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError("EMAIL_TAKEN", "An account with this email already exists.", 409);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.createCustomer({
      email: input.email,
      fullName: input.fullName,
      mobile: input.mobile || undefined,
      passwordHash,
    });

    await sendVerificationEmail(user);
    await auditLogService.log("USER_SIGNUP", {
      userId: user.id,
      entityType: "User",
      entityId: user.id,
      request,
    });

    return { id: user.id, email: user.email };
  },

  async verifyEmail(rawToken: string, request?: Request) {
    const hash = hashToken(rawToken);
    const record = await verificationTokenRepository.findValidByHash(hash);
    if (!record) {
      throw new AppError("TOKEN_INVALID_OR_EXPIRED", "This verification link is invalid or has expired.", 400);
    }

    const user = await userRepository.findByEmail(record.identifier);
    if (!user) {
      throw new AppError("TOKEN_INVALID_OR_EXPIRED", "This verification link is invalid or has expired.", 400);
    }

    await userRepository.markEmailVerified(user.id);
    await verificationTokenRepository.deleteByHash(hash);
    await auditLogService.log("EMAIL_VERIFIED", {
      userId: user.id,
      entityType: "User",
      entityId: user.id,
      request,
    });
  },

  async resendVerification(email: string) {
    const user = await userRepository.findByEmail(email);
    // Deliberately generic: don't reveal whether the account exists or is already
    // verified. Only send when there's something to send.
    if (user && !user.emailVerified) {
      await sendVerificationEmail(user);
    }
  },

  async forgotPassword(email: string, request?: Request) {
    const user = await userRepository.findByEmail(email);
    // Always succeeds from the caller's perspective — no email enumeration.
    if (!user || !user.passwordHash) return;

    const { raw, hash } = generateToken();
    await passwordResetTokenRepository.create(
      user.id,
      hash,
      new Date(Date.now() + RESET_TOKEN_TTL_MS)
    );

    const resetUrl = appUrl(`/reset-password?token=${raw}`);
    const { subject, text, html } = resetPasswordTemplate({
      fullName: user.fullName,
      resetUrl,
    });
    await getEmailProvider().send({ to: user.email, subject, text, html });

    await auditLogService.log("PASSWORD_RESET_REQUESTED", {
      userId: user.id,
      entityType: "User",
      entityId: user.id,
      request,
    });
  },

  async resetPassword(rawToken: string, newPassword: string, request?: Request) {
    const hash = hashToken(rawToken);
    const record = await passwordResetTokenRepository.findValidByHash(hash);
    if (!record) {
      throw new AppError("TOKEN_INVALID_OR_EXPIRED", "This reset link is invalid or has expired.", 400);
    }

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updatePasswordHash(record.userId, passwordHash);
    await passwordResetTokenRepository.invalidateAllForUser(record.userId);

    await auditLogService.log("PASSWORD_RESET_COMPLETED", {
      userId: record.userId,
      entityType: "User",
      entityId: record.userId,
      request,
    });
  },
};
