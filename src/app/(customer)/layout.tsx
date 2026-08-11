import { redirect } from "next/navigation";

import { auth } from "@/server/auth/auth";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";

/**
 * Protected route group for the customer dashboard, project shell, and profile.
 * `proxy.ts` already redirects unauthenticated requests before they reach here (with
 * the correct callbackUrl); this check is the actual authorization boundary and a
 * defense-in-depth backstop in case that optimistic check is ever bypassed.
 */
export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
