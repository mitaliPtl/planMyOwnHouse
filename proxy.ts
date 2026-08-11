import NextAuth from "next-auth";

import { authConfig } from "@/server/auth/auth.config";

/**
 * Next.js 16 renamed Middleware to Proxy (same mechanism, file convention changed).
 * This only performs the cheap "redirect if unauthenticated" UX check using
 * `authConfig` (edge-safe: no Prisma, no argon2). It is NOT the authorization
 * boundary — every protected route enforces access itself via
 * `requireAuth()`/`requireRole()` in `src/server/auth/require-auth.ts`.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
