import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const protectedPrefixes = ["/admin", "/admin-admissions", "/teacher", "/student", "/parent", "/it-portal"];
const publicItPaths = ["/it-portal/auth"];
const encoder = new TextEncoder();

function destinationFor(role: string) {
  if (["ADMIN", "DIRECTOR", "COORDINATOR", "BURSAR"].includes(role)) return "/admin";
  if (["TEACHER", "HOD"].includes(role)) return "/teacher/dashboard";
  if (role === "PARENT") return "/parent/dashboard";
  if (role === "IT_STUDENT") return "/it-portal/dashboard";
  return "/student/dashboard";
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (publicItPaths.some((path) => pathname.startsWith(path))) return NextResponse.next();
  if (!protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) return NextResponse.next();

  const token = request.cookies.get("ykay_session")?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret || secret.length < 32) return redirectToLogin(request);

  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret));
    const role = typeof payload.role === "string" ? payload.role : "";
    const adminPath = pathname.startsWith("/admin") || pathname.startsWith("/admin-admissions");
    const teacherPath = pathname.startsWith("/teacher");
    const parentPath = pathname.startsWith("/parent");
    const studentPath = pathname.startsWith("/student");
    const itPath = pathname.startsWith("/it-portal");
    const allowed =
      (adminPath && ["ADMIN", "DIRECTOR", "COORDINATOR", "BURSAR"].includes(role)) ||
      (teacherPath && ["TEACHER", "HOD", "ADMIN", "DIRECTOR"].includes(role)) ||
      (parentPath && role === "PARENT") ||
      (studentPath && role === "STUDENT") ||
      (itPath && ["IT_STUDENT", "STUDENT", "ADMIN", "DIRECTOR"].includes(role));
    if (!allowed) return NextResponse.redirect(new URL(destinationFor(role), request.url));
    return NextResponse.next();
  } catch {
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const url = new URL(pathname.startsWith("/it-portal") ? "/it-portal/auth" : "/login", request.url);
  if (!pathname.startsWith("/it-portal")) url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/admin-admissions/:path*", "/teacher/:path*", "/student/:path*", "/parent/:path*", "/it-portal/:path*"],
};
