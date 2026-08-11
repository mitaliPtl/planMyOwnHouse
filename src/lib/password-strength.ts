import zxcvbn from "zxcvbn";

const MIN_ZXCVBN_SCORE = 2; // 0-4; 2 = "somewhat guessable" is the floor we accept

/**
 * Password strength check — pure JS (zxcvbn), safe to import from both client and
 * server code (e.g. Zod schemas shared between a form and its API route). Kept
 * separate from src/server/auth/password.ts, which wraps argon2's native binding and
 * must never end up in a client bundle.
 */
export function checkPasswordStrength(
  password: string,
  userInputs: string[] = []
): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  const result = zxcvbn(password, userInputs);
  if (result.score < MIN_ZXCVBN_SCORE) {
    return (
      result.feedback.warning ||
      "This password is too weak. Try adding more length or a mix of words."
    );
  }

  return null;
}
