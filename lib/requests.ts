import type { NextRequest } from "next/server";

/**
 * Client-IP resolution for rate limiting and forensic logs.
 *
 * SECURITY (audit SEC-01 / H1): the previous implementation returned the
 * FIRST `X-Forwarded-For` entry. That entry is whatever the client chose to
 * send — every proxy after the client *appends* to the header, so the first
 * hop is attacker-controlled and each forged value minted a fresh
 * rate-limit budget (and poisoned audit-log IPs).
 *
 * This resolver instead counts from the RIGHT: with N trusted proxies in
 * front of the app (each appending the address it observed), the client
 * address is the entry those proxies vouch for — `entries[len - N]` —
 * and everything to its left is ignored as untrusted claims.
 *
 * `TRUSTED_PROXY_HOPS` (default 1) is the number of appending reverse
 * proxies in front of this process:
 *   - Vercel / Render / a single Caddy or nginx: 1 (the default)
 *   - CDN → load balancer → app: 2
 *   - App exposed directly with NO proxy: 0 — forwarding headers are then
 *     ignored entirely and per-IP limiters share the "unknown" bucket
 *     (per-account limiters still apply). Never leave the default in place
 *     for a directly exposed container.
 */

function validIpv4(value: string): boolean {
  const octets = value.split(".");
  return (
    octets.length === 4 &&
    octets.every((octet) => /^(0|[1-9][0-9]{0,2})$/.test(octet) && Number(octet) <= 255)
  );
}

function validIpv6(value: string): boolean {
  if (!value.includes(":") || value.includes("%") || value.includes("[") || value.includes(":::"))
    return false;
  let address = value.toLowerCase();
  // IPv4-mapped/embedded IPv6 (e.g. ::ffff:192.0.2.1) counts the final
  // dotted address as two 16-bit groups.
  if (address.includes(".")) {
    const lastColon = address.lastIndexOf(":");
    const ipv4 = address.slice(lastColon + 1);
    if (!validIpv4(ipv4)) return false;
    const octets = ipv4.split(".").map(Number);
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    address = `${address.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const compressed = address.includes("::");
  if (compressed && address.indexOf("::") !== address.lastIndexOf("::")) return false;
  if (!compressed && (address.startsWith(":") || address.endsWith(":"))) return false;
  const groups = address.split(":").filter(Boolean);
  if (!groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) return false;
  return compressed ? groups.length < 8 : groups.length === 8;
}

function saneIp(value: string | null | undefined): string | null {
  const candidate = (value || "").trim();
  if (!candidate || candidate.includes(" ")) return null;
  if (validIpv4(candidate) || validIpv6(candidate)) return candidate;
  return null;
}

export function trustedProxyHops(env: Record<string, string | undefined>): number {
  const raw = env.TRUSTED_PROXY_HOPS;
  if (raw === undefined || raw.trim() === "") return 1;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10) return 0;
  return parsed;
}

/**
 * Pure header→IP resolution (unit-tested). `get(name)` mirrors `Headers.get`.
 */
export function clientIpFromHeaders(
  get: (_headerName: string) => string | null,
  env: Record<string, string | undefined> = process.env,
): string {
  const hops = trustedProxyHops(env);
  if (hops === 0) return "unknown";

  const forwarded = get("x-forwarded-for");
  if (!forwarded) return "unknown";

  // Preserve empty/invalid entries rather than filtering them: filtering
  // shifts the trust boundary left and can turn an attacker-supplied value
  // into the selected address.
  const entries = forwarded.split(",").map((part) => part.trim());
  if (entries.length < hops) return "unknown";
  const index = entries.length - hops;
  return saneIp(entries[index]) || "unknown";
}

export function getClientIp(request: Request | NextRequest) {
  return clientIpFromHeaders((name) => request.headers.get(name), process.env);
}

export function jsonNoStore<T>(body: T, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      ...(init?.headers || {}),
    },
  });
}
