import "server-only";
import { randomBytes, createHash } from "node:crypto";

/**
 * Generates a raw, high-entropy token to email/link to the user, and its SHA-256 hash
 * to persist in the database. The raw value is never stored — only ever emailed once
 * and compared by re-hashing the value the user presents back.
 */
export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
