import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth/auth";
import { userService } from "@/services/user.service";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/profile");

  const profile = await userService.getProfile(session.user.id);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Your profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account details and delivery address.
        </p>
      </div>

      {!profile.emailVerified && (
        <Alert variant="destructive">
          <AlertDescription>
            Your email address ({profile.email}) is not verified yet. Check your inbox for the
            verification link.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>Email: {profile.email} (cannot be changed here)</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initial={{
              fullName: profile.fullName,
              mobile: profile.mobile,
              addressLine1: profile.profile?.addressLine1 ?? null,
              addressLine2: profile.profile?.addressLine2 ?? null,
              city: profile.profile?.city ?? null,
              state: profile.profile?.state ?? null,
              postalCode: profile.profile?.postalCode ?? null,
              country: profile.profile?.country ?? null,
              alternatePhone: profile.profile?.alternatePhone ?? null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
