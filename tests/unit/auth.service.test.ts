import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/repositories/user.repository", () => ({
  userRepository: {
    findByEmail: vi.fn(),
    createCustomer: vi.fn(),
    markEmailVerified: vi.fn(),
    updatePasswordHash: vi.fn(),
  },
}));

vi.mock("@/repositories/verification-token.repository", () => ({
  verificationTokenRepository: {
    create: vi.fn(),
    findValidByHash: vi.fn(),
    deleteByHash: vi.fn(),
  },
}));

vi.mock("@/repositories/password-reset-token.repository", () => ({
  passwordResetTokenRepository: {
    create: vi.fn(),
    findValidByHash: vi.fn(),
    markUsed: vi.fn(),
    invalidateAllForUser: vi.fn(),
  },
}));

vi.mock("@/server/auth/password", () => ({
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
}));

vi.mock("@/server/notifications/email", () => ({
  getEmailProvider: () => ({ send: vi.fn() }),
}));

vi.mock("@/services/audit-log.service", () => ({
  auditLogService: { log: vi.fn() },
}));

import { authService } from "@/services/auth.service";
import { userRepository } from "@/repositories/user.repository";
import { verificationTokenRepository } from "@/repositories/verification-token.repository";
import { passwordResetTokenRepository } from "@/repositories/password-reset-token.repository";
import { AppError } from "@/lib/errors";

const mockUserRepository = vi.mocked(userRepository);
const mockVerificationTokenRepository = vi.mocked(verificationTokenRepository);
const mockPasswordResetTokenRepository = vi.mocked(passwordResetTokenRepository);

const validSignupInput = {
  fullName: "Jane Doe",
  email: "jane@example.com",
  mobile: "",
  password: "correct-horse-battery-staple-42",
  confirmPassword: "correct-horse-battery-staple-42",
  acceptTerms: true as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authService.signup", () => {
  it("rejects signup when the email is already registered", async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: "existing-user",
    } as never);

    await expect(authService.signup(validSignupInput)).rejects.toMatchObject({
      code: "EMAIL_TAKEN",
    });
    expect(mockUserRepository.createCustomer).not.toHaveBeenCalled();
  });

  it("creates the user and sends a verification email on the happy path", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.createCustomer.mockResolvedValue({
      id: "new-user",
      email: validSignupInput.email,
      fullName: validSignupInput.fullName,
    } as never);

    const result = await authService.signup(validSignupInput);

    expect(result).toEqual({ id: "new-user", email: validSignupInput.email });
    expect(mockVerificationTokenRepository.create).toHaveBeenCalledOnce();
  });
});

describe("authService.verifyEmail", () => {
  it("rejects an invalid or expired verification token", async () => {
    mockVerificationTokenRepository.findValidByHash.mockResolvedValue(null);

    await expect(authService.verifyEmail("some-raw-token")).rejects.toMatchObject({
      code: "TOKEN_INVALID_OR_EXPIRED",
    });
    expect(mockUserRepository.markEmailVerified).not.toHaveBeenCalled();
  });

  it("marks the user verified and consumes the token on a valid token", async () => {
    mockVerificationTokenRepository.findValidByHash.mockResolvedValue({
      identifier: "jane@example.com",
    } as never);
    mockUserRepository.findByEmail.mockResolvedValue({ id: "user-1" } as never);

    await authService.verifyEmail("some-raw-token");

    expect(mockUserRepository.markEmailVerified).toHaveBeenCalledWith("user-1");
    expect(mockVerificationTokenRepository.deleteByHash).toHaveBeenCalledOnce();
  });
});

describe("authService.resetPassword", () => {
  it("rejects an invalid, expired, or already-used reset token", async () => {
    mockPasswordResetTokenRepository.findValidByHash.mockResolvedValue(null);

    await expect(authService.resetPassword("bad-token", "N3wPassw0rd!!")).rejects.toBeInstanceOf(
      AppError
    );
    expect(mockUserRepository.updatePasswordHash).not.toHaveBeenCalled();
  });

  it("updates the password and invalidates the token on a valid token", async () => {
    mockPasswordResetTokenRepository.findValidByHash.mockResolvedValue({
      id: "reset-1",
      userId: "user-1",
    } as never);

    await authService.resetPassword("good-token", "N3wPassw0rd!!");

    expect(mockUserRepository.updatePasswordHash).toHaveBeenCalledWith(
      "user-1",
      "hashed:N3wPassw0rd!!"
    );
    expect(mockPasswordResetTokenRepository.invalidateAllForUser).toHaveBeenCalledWith("user-1");
  });
});

describe("authService.forgotPassword", () => {
  it("does not throw and does not create a reset token for an unknown email", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    await expect(authService.forgotPassword("nobody@example.com")).resolves.toBeUndefined();
    expect(mockPasswordResetTokenRepository.create).not.toHaveBeenCalled();
  });
});
