import { NextResponse } from "next/server";
import { virtualBaseUrl } from "@/lib/virtual-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /sso/virtual — safe YK-Virtual destination redirect (UX-01).
 *
 * The login page previously linked here, but the route did not exist and
 * every click produced a 404. This route now sends the visitor to the
 * configured Virtual origin. It deliberately does NOT claim that a College
 * session has been exchanged: the two apps need an independently configured
 * server-to-server SSO handoff (COLLEGE_SSO_SECRET + the Virtual service),
 * which is not implemented or verified in this repository. No College JWT,
 * user ID, or auth material is put in the URL or referrer.
 */
export async function GET() {
  const response = NextResponse.redirect(virtualBaseUrl(process.env), 307);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
