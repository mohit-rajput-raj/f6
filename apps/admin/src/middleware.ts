import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware that protects all admin dashboard routes.
 * Checks for the httpOnly admin_session cookie.
 */
export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("admin_session")?.value;
  const { pathname } = request.nextUrl;

  // Protected admin routes:
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/subscribers") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/logs") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/settings");

  // Auth pages:
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/signin";

  // 1. If not logged in and accessing protected route -> redirect to /login
  if (isProtectedRoute && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If already logged in and visiting login or register -> redirect to /dashboard
  if (isAuthPage && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/users/:path*",
    "/subscribers/:path*",
    "/analytics/:path*",
    "/logs/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/login",
    "/register",
    "/signin",
  ],
};
