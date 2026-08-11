import "server-only";

import { userRepository } from "@/repositories/user.repository";
import { customerProfileRepository } from "@/repositories/customer-profile.repository";
import { auditLogService } from "@/services/audit-log.service";
import { NotFoundError } from "@/lib/errors";
import type { UpdateProfileInput } from "@/validators/profile.validators";

export const userService = {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("User not found.");

    const profile = await customerProfileRepository.findByUserId(userId);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      mobile: user.mobile,
      emailVerified: Boolean(user.emailVerified),
      role: user.role.name,
      profile,
    };
  },

  async updateProfile(userId: string, input: UpdateProfileInput, request?: Request) {
    const { fullName, mobile, ...addressFields } = input;

    if (fullName !== undefined || mobile !== undefined) {
      await userRepository.updateFields(userId, { fullName, mobile });
    }

    const profile = await customerProfileRepository.upsert(userId, addressFields);

    await auditLogService.log("PROFILE_UPDATED", {
      userId,
      entityType: "CustomerProfile",
      entityId: profile.id,
      request,
    });

    return this.getProfile(userId);
  },
};
