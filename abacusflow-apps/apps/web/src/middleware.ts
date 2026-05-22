import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/callback", "/_not-found", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for auth token cookie (set by client-side auth)
  const hasToken = request.cookies.has("auth_token");

  // In demo mode (no Auth0 configured), allow all requests
  const hasAuth0 = process.env.AUTH0_CLIENT_ID && process.env.AUTH0_DOMAIN;
  if (!hasAuth0) {
    return NextResponse.next();
  }

  // With Auth0: redirect to login if no token
  if (!hasToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
