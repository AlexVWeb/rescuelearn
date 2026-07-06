import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Exclude static assets, public files, API, and the maintenance page itself
  const isAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".") ||
    pathname === "/maintenance";

  if (isAsset) {
    return NextResponse.next();
  }

  const isMaintenance = process.env.MAINTENANCE_MODE === "true";
  const bypassToken = process.env.MAINTENANCE_BYPASS_TOKEN || "";

  if (!isMaintenance) {
    return NextResponse.next();
  }

  // Enforce secure token rules: must be at least 32 characters
  const isTokenSecure = bypassToken.length >= 32;

  // Check query parameter ?bypass=...
  const queryBypass = searchParams.get("bypass");
  if (queryBypass && isTokenSecure && safeCompare(queryBypass, bypassToken)) {
    // Set secure cookie and redirect to strip the token from URL
    const cleanUrl = new URL(pathname, request.url);
    // Preserves other query params if any, but removes bypass
    searchParams.delete("bypass");
    cleanUrl.search = searchParams.toString();

    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set("maintenance_bypass", bypassToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    return response;
  }

  // Check existing bypass cookie
  const cookieBypass = request.cookies.get("maintenance_bypass")?.value;
  if (cookieBypass && isTokenSecure && safeCompare(cookieBypass, bypassToken)) {
    return NextResponse.next();
  }

  // Redirect to maintenance page
  const maintenanceUrl = new URL("/maintenance", request.url);
  return NextResponse.redirect(maintenanceUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
