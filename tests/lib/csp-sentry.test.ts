import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "@/lib/csp";

/**
 * OBS-01 regression: with a Sentry DSN configured, connect-src must allow
 * the ingest hosts — otherwise the browser SDK is silently CSP-blocked
 * while the server side keeps reporting.
 */
function connectSrc(policy: string) {
  return policy.split("; ").find((d) => d.startsWith("connect-src")) ?? "";
}

describe("buildContentSecurityPolicy Sentry origin", () => {
  it("allows only the exact region-specific Sentry DSN origin", () => {
    const on = buildContentSecurityPolicy({
      isProduction: true,
      plausible: false,
      storageOrigin: null,
      sentryDsn: "https://public-key@o123.ingest.us.sentry.io/987654",
    });
    expect(connectSrc(on)).toContain("https://o123.ingest.us.sentry.io");
    expect(connectSrc(on)).not.toContain("*.ingest");
    expect(connectSrc(on)).not.toContain("https://sentry.io");
  });

  it("omits Sentry when unset, malformed, or insecure in production", () => {
    const off = buildContentSecurityPolicy({
      isProduction: true,
      plausible: false,
      storageOrigin: null,
    });
    const malformed = buildContentSecurityPolicy({
      isProduction: true,
      plausible: false,
      storageOrigin: null,
      sentryDsn: "not a DSN",
    });
    const insecure = buildContentSecurityPolicy({
      isProduction: true,
      plausible: false,
      storageOrigin: null,
      sentryDsn: "http://localhost:9000/1",
    });
    for (const policy of [off, malformed, insecure])
      expect(connectSrc(policy)).not.toContain("sentry");
    expect(connectSrc(off)).toBe(
      "connect-src 'self' https://api.paystack.co https://*.upstash.io https://*.neon.tech",
    );
  });
});
