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
