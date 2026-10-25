import { NextResponse, type NextRequest } from "next/server";

// Explicit routes under (unixl-org) that require authenticated organizer session
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/desks",
  "/members",
  "/messages",
  "/assets",
  "/announcements",
  "/settings",
  "/register-org",
  "/explore",
];

interface SessionPayload {
  id: string;
  name?: string;
  email: string;
  role?: string;
  avatar?: string | null;
  activeOrganizationId?: string | null;
}

// Helper to verify HMAC-SHA256 session token in Edge runtime and return user payload
async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [bodyB64, signatureB64] = parts;

    // Decode and parse payload
    const jsonStr = atob(bodyB64.replace(/-/g, "+").replace(/_/g, "/"));
    const data = JSON.parse(jsonStr);

    // Validate payload fields
    if (!data.id || !data.email) return null;
    if (data.exp && typeof data.exp === "number" && data.exp < Date.now()) {
      return null; // Expired
    }

    // Secret key for HMAC
    const secret =
      process.env.AUTH_SECRET ||
      process.env.BETTER_AUTH_SECRET ||
      "campus-organizer-secure-session-secret-2026";

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Decode base64url signature to binary
    const binarySig = atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/"));
    const sigBytes = new Uint8Array(binarySig.length);
    for (let i = 0; i < binarySig.length; i++) {
      sigBytes[i] = binarySig.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      enc.encode(bodyB64)
    );

    if (!isValid) return null;

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      avatar: data.avatar ?? null,
      activeOrganizationId: data.activeOrganizationId ?? null,
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if current path matches any protected route
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const sessionToken = request.cookies.get("organizer_session")?.value;
  const sessionUser = await verifySessionToken(sessionToken);
  const isAuthenticated = !!sessionUser;
  const hasActiveOrg = !!sessionUser?.activeOrganizationId;

  // 1. Protect (unixl-org) workspace routes
  if (isProtected) {
    if (!isAuthenticated) {
      // Unauthenticated visitor: redirect to /login and preserve return URL
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);

      const response = NextResponse.redirect(loginUrl);
      if (sessionToken) {
        // Clear invalid/expired session cookie
        response.cookies.delete("organizer_session");
      }
      return response;
    }

    // At least one organization must be registered before entering unixl-org panel
    if (!hasActiveOrg && pathname !== "/register-org") {
      return NextResponse.redirect(new URL("/register?step=org", request.url));
    }
  }

  // 2. Redirect authenticated users away from /login
  if (pathname === "/login" && isAuthenticated) {
    if (hasActiveOrg) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/register?step=org", request.url));
    }
  }

  // 3. For /register: if user already has an active organization, redirect to dashboard.
  // If they have no active organization, allow them to stay on /register to complete the 4 steps!
  if (pathname === "/register" && isAuthenticated && hasActiveOrg) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static, _next/image
     * - favicon.ico, sitemap.xml, robots.txt
     * - static image/font assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};

