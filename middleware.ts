import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const protectedPrefixes = [
  "/admin",
  "/admin-admissions",
  "/teacher",
  "/student",
  "/parent",
  "/it-portal",
  "/super-admin",
  "/change-password",
  "/staff",
];
const publicItPaths = ["/it-portal/auth"];
const encoder = new TextEncoder();

function destinationFor(role: string) {
  if (role === "SUPER_ADMIN") return "/super-admin";
  if (["ADMIN", "DIRECTOR", "COORDINATOR", "BURSAR"].includes(role)) return "/admin";
  if (["TEACHER", "HOD"].includes(role)) return "/teacher/dashboard";
  if (role === "PARENT") return "/parent/dashboard";
  if (role === "IT_STUDENT") return "/it-portal/dashboard";
  return "/student/dashboard";
}

/**
 * Logs an auth denial to the security forensics endpoint (fire-and-forget).
 * This gives super-admins visibility into who is being denied and why.
 */
function logDenial(
  eventType: string,
  pathname: string,
  email: string | undefined,
  reason: string,
  ip: string,
) {
  // Fire-and-forget POST to our forensics API.
  // We don't await because middleware must return quickly.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  fetch(`${baseUrl}/api/internal/security-event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.AUTH_SECRET || "",
    },
    body: JSON.stringify({
      eventType,
      targetPath: pathname,
      userEmail: email,
      reason,
      ipAddress: ip,
    }),
  }).catch(() => {
    /* swallow — middleware must not block on logging */
  });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // ── CORS preflight for API routes ──
  // Native mobile ignores CORS; this serves browser cross-origin callers
  // (e.g. a future custom-domain web app) and standards-compliant tooling.
  if (pathname.startsWith("/api/") && method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_SITE_URL || "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,x-idempotency-key",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // ── Read-only super-admin impersonation ──
  // Block every mutating API request while impersonating (except the endpoints
  // that manage the impersonation/session themselves). This is the single,
  // global enforcement point — no route needs to remember to check.
  if (
    pathname.startsWith("/api/") &&
    method !== "GET" &&
    method !== "HEAD" &&
    method !== "OPTIONS" &&
    pathname !== "/api/super-admin/impersonate" &&
    pathname !== "/api/auth/logout"
  ) {
    const impToken = request.cookies.get("ykay_session")?.value;
    const impSecret = process.env.AUTH_SECRET;
    if (impToken && impSecret && impSecret.length >= 32) {
      try {
        const { payload } = await jwtVerify(impToken, encoder.encode(impSecret));
        if (payload.impersonatedBy) {
          return NextResponse.json(
            { error: "Writes are not permitted while impersonating. End impersonation first." },
            { status: 403 },
          );
        }
      } catch {
        // invalid/expired token — let the route's own auth reject it
      }
    }
  }

  if (publicItPaths.some((path) => pathname.startsWith(path))) return NextResponse.next();
  if (!protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) return NextResponse.next();

  const token = request.cookies.get("ykay_session")?.value;
  const secret = process.env.AUTH_SECRET;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!token || !secret || secret.length < 32) {
    logDenial("AUTH_DENIED_SESSION_INVALID", pathname, undefined, "No valid session cookie.", ip);
    return redirectToLogin(request);
  }

  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret));
    const role = typeof payload.role === "string" ? payload.role : "";
    const email = typeof payload.email === "string" ? payload.email : undefined;

    if (payload.mustChangePassword === true && pathname !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", request.url));
    }

    const changePasswordPath = pathname.startsWith("/change-password");
    const adminPath = pathname.startsWith("/admin") || pathname.startsWith("/admin-admissions");
    const teacherPath = pathname.startsWith("/teacher");
    const parentPath = pathname.startsWith("/parent");
    const studentPath = pathname.startsWith("/student");
    const itPath = pathname.startsWith("/it-portal");
    const staffPath = pathname.startsWith("/staff");
    const superPath = pathname.startsWith("/super-admin");

    const allowed =
      changePasswordPath ||
      (superPath && role === "SUPER_ADMIN") ||
      (adminPath && ["ADMIN", "DIRECTOR", "COORDINATOR", "BURSAR", "SUPER_ADMIN"].includes(role)) ||
      (teacherPath && ["TEACHER", "HOD", "ADMIN", "DIRECTOR"].includes(role)) ||
      (parentPath && role === "PARENT") ||
      (studentPath && role === "STUDENT") ||
      (itPath && ["IT_STUDENT", "STUDENT", "ADMIN", "DIRECTOR"].includes(role)) ||
      (staffPath &&
        ["TEACHER", "HOD", "ADMIN", "DIRECTOR", "COORDINATOR", "BURSAR"].includes(role));

    if (!allowed) {
      logDenial(
        "AUTH_DENIED_INSUFFICIENT_ROLE",
        pathname,
        email,
        `Role ${role} cannot access ${pathname}.`,
        ip,
      );
      return NextResponse.redirect(new URL(destinationFor(role), request.url));
    }
    return NextResponse.next();
  } catch {
    logDenial("AUTH_DENIED_SESSION_EXPIRED", pathname, undefined, "JWT verification failed.", ip);
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const url = new URL(
    pathname.startsWith("/it-portal") ? "/it-portal/auth" : "/login",
    request.url,
  );
  if (!pathname.startsWith("/it-portal")) url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/admin/:path*",
    "/admin-admissions/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/parent/:path*",
    "/it-portal/:path*",
    "/super-admin/:path*",
    "/staff/:path*",
    "/change-password",
  ],
};
