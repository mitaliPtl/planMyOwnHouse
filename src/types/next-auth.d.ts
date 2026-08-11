import type { RoleName } from "@/generated/prisma/client";

declare module "next-auth" {
  interface User {
    role?: RoleName;
    rememberMe?: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: RoleName;
      fullName: string;
    } & Omit<import("next-auth").User, "id" | "role">;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: RoleName;
    fullName: string;
    rememberMe: boolean;
    absoluteExpiry: number;
  }
}
