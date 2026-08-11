import "server-only";

import { prisma } from "@/lib/prisma";

export const verificationTokenRepository = {
  async create(identifier: string, tokenHash: string, expires: Date) {
    // Only one outstanding verification link per email — replace, don't accumulate.
    await prisma.verificationToken.deleteMany({ where: { identifier } });
    return prisma.verificationToken.create({ data: { identifier, token: tokenHash, expires } });
  },

  findValidByHash(tokenHash: string) {
    return prisma.verificationToken.findFirst({
      where: { token: tokenHash, expires: { gt: new Date() } },
    });
  },

  deleteByHash(tokenHash: string) {
    return prisma.verificationToken.deleteMany({ where: { token: tokenHash } });
  },
};
