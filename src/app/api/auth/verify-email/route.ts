import { NextResponse } from "next/server";

import { authService } from "@/services/auth.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const loginUrl = new URL("/login", url.origin);

  if (!token) {
    loginUrl.searchParams.set("verified", "invalid");
    return NextResponse.redirect(loginUrl);
  }

  try {
    await authService.verifyEmail(token, request);
    loginUrl.searchParams.set("verified", "success");
  } catch {
    loginUrl.searchParams.set("verified", "invalid");
  }

  return NextResponse.redirect(loginUrl);
}
