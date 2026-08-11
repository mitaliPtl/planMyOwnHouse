import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe subset of the Auth.js config — no Prisma, no argon2 (native binding),
 * since `proxy.ts` runs on the Edge runtime. Used by proxy.ts for the cheap
 * "redirect if unauthenticated" UX check only. It is NOT the authorization boundary —
 * every protected API route/Server Component enforces access itself via
 * `requireAuth()`/`requireRole()` (Node runtime), which is the actual security check.
 *
 * `auth.ts` spreads this config and adds the Credentials/Google providers and the
 * Prisma adapter, which need the Node.js runtime.
 */
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Every page inside the `(customer)` route group — must stay in sync with the routes
// under src/app/(customer)/. This is only the optimistic UX redirect; the actual
// authorization boundary is requireAuth() in each of those routes/layouts.
const PROTECTED_ROUTE_PREFIXES = ["/dashboard", "/projects", "/profile"];

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: THIRTY_DAYS_MS / 1000,
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isCustomerRoute = PROTECTED_ROUTE_PREFIXES.some((prefix) =>
        request.nextUrl.pathname.startsWith(prefix)
      );

      if (isCustomerRoute) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      const now = Date.now();

      // Only present on the initial sign-in call — persisted onto the token from
      // there on, since Credentials/OAuth don't run again on every request.
      if (user) {
        token.id = user.id as string;
        token.role = user.role!;
        token.fullName = user.name ?? "";
        token.rememberMe = Boolean(user.rememberMe);
        token.absoluteExpiry = now + (token.rememberMe ? THIRTY_DAYS_MS : TWO_HOURS_MS);
      }

      // Session cookie maxAge is a fixed 30-day outer bound; this enforces the
      // shorter "not remembered" window independently of that cookie lifetime.
      if (token.absoluteExpiry && now > token.absoluteExpiry) {
        return null;
      }

      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.fullName = token.fullName;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
