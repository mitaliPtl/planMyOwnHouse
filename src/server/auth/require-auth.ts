import "server-only";
import { redirect } from "next/navigation";

import { auth } from "./auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import type { RoleName } from "@/generated/prisma/client";

/**
 * The pattern every protected API route / Server Component / admin page reuses.
 * Reads the verified JWT session — never a client-supplied user id or role. This is
 * the actual authorization boundary; `proxy.ts` only does a cheap optimistic redirect
 * for UX and must never be relied on for real access control.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return session.user;
}

export async function requireRole(role: RoleName | RoleName[]) {
  const user = await requireAuth();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role)) {
    throw new ForbiddenError();
  }
  return user;
}

/**
 * For login/signup/forgot-password pages: an already-authenticated visitor shouldn't
 * be shown the form again (it reads as "you got logged out" even though the session
 * is still valid). Not used on reset-password — that flow is token-driven and, since
 * there's no in-app "change password" yet, is the only way to change a password even
 * while already signed in.
 */
export async function redirectIfAuthenticated(destination = "/dashboard") {
  const session = await auth();
  if (session?.user) {
    redirect(destination);
  }
}
