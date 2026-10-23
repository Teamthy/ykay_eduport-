/**
 * YK-Virtual destination resolution for the /sso/virtual redirect (UX-01).
 *
 * The login page linked to /sso/virtual, a route that did not exist, so the
 * advertised Virtual journey ended in a 404. This helper resolves only a
 * safe destination origin. It intentionally does not claim to exchange a
 * College session; federated SSO requires the separate Virtual service and
 * COLLEGE_SSO_SECRET to be configured and tested. No token is put in a URL.
 */

export const DEFAULT_VIRTUAL_URL = "https://virtual.ykaycollege.com";

export function virtualBaseUrl(env: Record<string, string | undefined>): string {
  const raw = (env.NEXT_PUBLIC_VIRTUAL_URL || DEFAULT_VIRTUAL_URL).trim();
  try {
    const url = new URL(raw);
    const isLocalDev =
      url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if (url.protocol !== "https:" && !isLocalDev) return DEFAULT_VIRTUAL_URL;
    // Origin only: any path/query in the configured value is dropped so a
    // misconfigured variable cannot smuggle parameters into the handoff.
    return url.origin;
  } catch {
    return DEFAULT_VIRTUAL_URL;
  }
}
