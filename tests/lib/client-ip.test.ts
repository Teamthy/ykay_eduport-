import { describe, expect, it } from "vitest";
import { clientIpFromHeaders, trustedProxyHops } from "@/lib/requests";

/**
 * SEC-01 regression: the first X-Forwarded-For entry is attacker-controlled.
 * The resolver must count trusted proxies from the right of the chain.
 */

function headers(map: Record<string, string>) {
  return (name: string) => map[name.toLowerCase()] ?? null;
}

describe("clientIpFromHeaders", () => {
  it("ignores a forged first XFF entry behind one trusted proxy", () => {
    // Attacker at 203.0.113.9 sends `X-Forwarded-For: 1.2.3.4`; the proxy
    // appends the address it actually saw.
    const ip = clientIpFromHeaders(headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }), {});
    expect(ip).toBe("203.0.113.9");
  });

  it("returns the only entry when the proxy set the header itself", () => {
    const ip = clientIpFromHeaders(headers({ "x-forwarded-for": "203.0.113.9" }), {});
    expect(ip).toBe("203.0.113.9");
  });

  it("counts two trusted proxies correctly (CDN -> LB -> app)", () => {
    const ip = clientIpFromHeaders(
      headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.9, 10.0.0.5" }),
      { TRUSTED_PROXY_HOPS: "2" },
    );
    expect(ip).toBe("203.0.113.9");
  });

  it("returns unknown instead of trusting an incomplete chain", () => {
    const ip = clientIpFromHeaders(
      headers({ "x-forwarded-for": "1.2.3.4" }),
      { TRUSTED_PROXY_HOPS: "2" },
    );
    expect(ip).toBe("unknown");
  });

  it("ignores forwarding headers entirely when TRUSTED_PROXY_HOPS=0", () => {
    const ip = clientIpFromHeaders(
      headers({ "x-forwarded-for": "203.0.113.9", "x-real-ip": "203.0.113.9" }),
      { TRUSTED_PROXY_HOPS: "0" },
    );
    expect(ip).toBe("unknown");
  });

  it("does not trust a standalone x-real-ip supplied without XFF", () => {
    const ip = clientIpFromHeaders(headers({ "x-real-ip": "198.51.100.7" }), {});
    expect(ip).toBe("unknown");
  });

  it("does not shift the trust boundary across malformed chain entries", () => {
    const ip = clientIpFromHeaders(
      headers({ "x-forwarded-for": "1.2.3.4, 198.51.100.7, not-an-ip" }),
      { TRUSTED_PROXY_HOPS: "1" },
    );
    expect(ip).toBe("unknown");
  });

  it("rejects garbage header values", () => {
    const ip = clientIpFromHeaders(
      headers({ "x-forwarded-for": "not an ip!!", "x-real-ip": "<script>" }),
      {},
    );
    expect(ip).toBe("unknown");
  });

  it("handles IPv6 entries", () => {
    const ip = clientIpFromHeaders(headers({ "x-forwarded-for": "2001:db8::1, 2001:db8::2" }), {});
    expect(ip).toBe("2001:db8::2");
  });
});

describe("trustedProxyHops", () => {
  it("defaults to one proxy", () => {
    expect(trustedProxyHops({})).toBe(1);
    expect(trustedProxyHops({ TRUSTED_PROXY_HOPS: "" })).toBe(1);
  });

  it("fails closed (0) on nonsense values", () => {
    expect(trustedProxyHops({ TRUSTED_PROXY_HOPS: "banana" })).toBe(0);
    expect(trustedProxyHops({ TRUSTED_PROXY_HOPS: "-3" })).toBe(0);
  });
});
