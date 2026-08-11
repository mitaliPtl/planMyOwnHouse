import "server-only";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "@auth/core/adapters";

import { prisma } from "@/lib/prisma";
import { RoleName } from "@/generated/prisma/client";

/**
 * Wraps @auth/prisma-adapter's PrismaAdapter to fill in the fields our schema
 * requires that the default adapter doesn't know about: `roleId` (non-nullable) and
 * `fullName` (required). Without this, a brand-new Google sign-in fails the
 * `prisma.user.create` call inside the default adapter.
 *
 * Also marks OAuth-created users as email-verified immediately — Google has already
 * verified the address, so there's no separate verification email for that path.
 */
export function getAuthPrismaAdapter(): Adapter {
  // @auth/prisma-adapter types its parameter against the generic @prisma/client
  // PrismaClient; our client is generated to a custom output path with an identical
  // runtime shape. Structurally compatible — cast is safe.
  const base = PrismaAdapter(prisma as never);

  return {
    ...base,
    async createUser(user: Omit<AdapterUser, "id">) {
      const customerRole = await prisma.role.findUniqueOrThrow({
        where: { name: RoleName.CUSTOMER },
      });

      const created = await prisma.user.create({
        data: {
          email: user.email,
          emailVerified: new Date(),
          fullName: user.name ?? user.email,
          image: user.image ?? undefined,
          roleId: customerRole.id,
        },
      });

      return {
        id: created.id,
        email: created.email,
        emailVerified: created.emailVerified,
        name: created.fullName,
        image: created.image,
      } satisfies AdapterUser;
    },
  };
}
