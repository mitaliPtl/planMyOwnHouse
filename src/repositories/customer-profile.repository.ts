import "server-only";

import { prisma } from "@/lib/prisma";
import type { UpdateProfileInput } from "@/validators/profile.validators";

export const customerProfileRepository = {
  findByUserId(userId: string) {
    return prisma.customerProfile.findUnique({ where: { userId } });
  },

  upsert(userId: string, data: Omit<UpdateProfileInput, "fullName" | "mobile">) {
    const fields = {
      addressLine1: data.addressLine1 || null,
      addressLine2: data.addressLine2 || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      alternatePhone: data.alternatePhone || null,
    };

    return prisma.customerProfile.upsert({
      where: { userId },
      update: fields,
      create: { userId, ...fields },
    });
  },
};
