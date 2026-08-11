import "server-only";

import { prisma } from "@/lib/prisma";
import { RoleName } from "@/generated/prisma/client";

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, include: { role: true } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, include: { role: true } });
  },

  async createCustomer(input: {
    email: string;
    fullName: string;
    mobile?: string;
    passwordHash: string;
  }) {
    const customerRole = await prisma.role.findUniqueOrThrow({
      where: { name: RoleName.CUSTOMER },
    });

    return prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        mobile: input.mobile || undefined,
        passwordHash: input.passwordHash,
        roleId: customerRole.id,
      },
    });
  },

  markEmailVerified(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });
  },

  updatePasswordHash(userId: string, passwordHash: string) {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  },

  updateFields(userId: string, data: { fullName?: string; mobile?: string }) {
    return prisma.user.update({ where: { id: userId }, data });
  },
};
