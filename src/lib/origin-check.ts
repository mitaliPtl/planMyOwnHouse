import { ForbiddenError } from "@/lib/errors";

/**
 * Defense-in-depth CSRF check for custom state-changing JSON routes (signup,
 * forgot-password, reset-password, profile PATCH). The primary defense is the
 * `SameSite=Lax` session cookie, which already blocks cross-site form POSTs from
 * top-level navigation; this rejects requests whose Origin/Sec-Fetch-Site headers
 * don't match the app's own origin. Auth.js's own `/api/auth/*` routes have their own
 * built-in double-submit CSRF protection and don't need this.
 */
export function assertSameOrigin(request: Request) {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
    throw new ForbiddenError("Cross-site request blocked");
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    // Same-origin requests from same-site navigations may omit Origin; fall back to
    // sec-fetch-site above. If neither header is present, allow (e.g. server-to-server
    // or non-browser clients are out of scope for this check).
    return;
  }

  const requestUrl = new URL(request.url);
  if (new URL(origin).host !== requestUrl.host) {
    throw new ForbiddenError("Cross-site request blocked");
  }
}
