/**
 * Sign-in landing pages per role.
 *
 * Shared by the client (where a signed-out browser is sent) and by
 * `/api/auth/logout` (where the server redirects a browser-navigation
 * sign-out). One mapping, so the two transports cannot disagree about which
 * portal a student or a parent should land on.
 *
 * Deliberately framework-free: importing this from a route handler must not
 * pull React into the server bundle.
 */
export function signInPathForRole(role?: string): string {
  if (role === "STUDENT") return "/login?portal=student";
  if (role === "PARENT") return "/login?portal=parent";
  if (role === "IT_STUDENT") return "/it-portal/auth";
  if (
    role === "TEACHER" ||
    role === "HOD" ||
    role === "ADMIN" ||
    role === "DIRECTOR" ||
    role === "COORDINATOR" ||
    role === "BURSAR" ||
    role === "SUPER_ADMIN"
  ) {
    return "/login?portal=staff";
  }
  return "/login";
}

/** The same landing page, with the "you just signed out" marker. */
export function signedOutPathForRole(role?: string): string {
  const path = signInPathForRole(role);
  return `${path}${path.includes("?") ? "&" : "?"}signedout=1`;
}

/**
 * Where a browser signs out: the route handler that revokes the session, clears
 * the cookie and answers with a 303 to the sign-in page.
 *
 * This is deliberately a path, not a fetch target. Sign-out controls render it
 * as an anchor href, so signing out survives a bundle that never hydrated or
 * has thrown; the confirmation dialog is an enhancement on top, not the
 * transport.
 */
export function logoutPathForRole(role?: string): string {
  return role ? `/api/auth/logout?role=${encodeURIComponent(role)}` : "/api/auth/logout";
}
