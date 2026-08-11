import { describe, it, expect } from "vitest";

import { hashPassword, verifyPassword } from "@/server/auth/password";
import { checkPasswordStrength } from "@/lib/password-strength";

describe("hashPassword / verifyPassword", () => {
  it("verifies the correct password against its hash", async () => {
    const hash = await hashPassword("Str0ng!Passw0rd");
    await expect(verifyPassword(hash, "Str0ng!Passw0rd")).resolves.toBe(true);
  });

  it("rejects an incorrect password against the hash", async () => {
    const hash = await hashPassword("Str0ng!Passw0rd");
    await expect(verifyPassword(hash, "wrong-password")).resolves.toBe(false);
  });

  it("never returns the plaintext password from the hash", async () => {
    const hash = await hashPassword("Str0ng!Passw0rd");
    expect(hash).not.toContain("Str0ng!Passw0rd");
  });
});

describe("checkPasswordStrength", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(checkPasswordStrength("Sh0rt!")).not.toBeNull();
  });

  it("rejects common/weak passwords", () => {
    expect(checkPasswordStrength("password123")).not.toBeNull();
  });

  it("accepts a sufficiently strong password", () => {
    expect(checkPasswordStrength("correct-horse-battery-staple-42")).toBeNull();
  });

  it("penalizes passwords built from the user's own email/name", () => {
    const result = checkPasswordStrength("johndoe123", ["johndoe123@example.com", "John Doe"]);
    expect(result).not.toBeNull();
  });
});
