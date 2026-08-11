import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { authConfig } from "./auth.config";
import { getAuthPrismaAdapter } from "./prisma-adapter";
import { verifyPassword } from "./password";
import { prisma } from "@/lib/prisma";
import { env } from "@/config/env";
import { loginSchema } from "@/validators/auth.validators";
import { InMemoryRateLimiter } from "@/lib/rate-limit";

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

class AccountDisabledError extends CredentialsSignin {
  code = "account_disabled";
}

class TooManyAttemptsError extends CredentialsSignin {
  code = "too_many_attempts";
}

// Per-process limiter for credentials login. Same local-dev caveat as lib/rate-limit's
// InMemoryRateLimiter — not shared across instances.
const loginRateLimiter = new InMemoryRateLimiter(10, 15 * 60 * 1000);

const googleProvider =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? [Google({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET })]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: getAuthPrismaAdapter(),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember me" },
      },
      async authorize(rawCredentials, request) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) throw new InvalidCredentialsError();
        const { email, password, rememberMe } = parsed.data;

        const ip = request.headers.get("x-forwarded-for") ?? "local";
        const { success } = await loginRateLimiter.limit(`login:${ip}:${email}`);
        if (!success) throw new TooManyAttemptsError();

        const user = await prisma.user.findUnique({
          where: { email },
          include: { role: true },
        });
        if (!user || !user.passwordHash) throw new InvalidCredentialsError();

        const valid = await verifyPassword(user.passwordHash, password);
        if (!valid) throw new InvalidCredentialsError();

        if (!user.isActive) throw new AccountDisabledError();
        if (!user.emailVerified) throw new EmailNotVerifiedError();

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role.name,
          rememberMe,
        };
      },
    }),
    ...googleProvider,
  ],
});
