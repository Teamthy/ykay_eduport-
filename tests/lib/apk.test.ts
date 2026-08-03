import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { apkFallbackUrl, apkQrUrl, apkSizeLabel, apkUrl } from "@/lib/apk";

/**
 * APK download URL resolution.
 *
 * The Android app is distributed as a direct download, so this URL appears on
 * the homepage CTA, the hero, /download and the mobile version-gate API. It
 * was previously read straight from `process.env` in four places under TWO
 * different names (`NEXT_PUBLIC_APK_URL` and `MOBILE_APK_URL`), so configuring
 * one left the others silently pointing at nothing — and the hero fell back to
 * an anchor link that goes nowhere.
 */

const KEYS = [
  "NEXT_PUBLIC_APK_URL",
  "MOBILE_APK_URL",
  "NEXT_PUBLIC_APK_FALLBACK_URL",
  "NEXT_PUBLIC_APK_SIZE",
] as const;

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  for (const key of KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("apkUrl", () => {
  it("returns null when nothing is configured", () => {
    // Null, not "" — callers branch on it to show a configuration notice
    // rather than rendering a button that goes nowhere.
    expect(apkUrl()).toBeNull();
  });

  it("prefers the NEXT_PUBLIC_ name", () => {
    process.env.NEXT_PUBLIC_APK_URL = "https://example.com/a.apk";
    process.env.MOBILE_APK_URL = "https://example.com/b.apk";
    expect(apkUrl()).toBe("https://example.com/a.apk");
  });

  it("still accepts the server-only name, so an existing deploy keeps working", () => {
    process.env.MOBILE_APK_URL = "https://example.com/b.apk";
    expect(apkUrl()).toBe("https://example.com/b.apk");
  });

  it("treats whitespace as unset", () => {
    // A env var pasted with a stray newline would otherwise render a button
    // linking to a blank URL.
    process.env.NEXT_PUBLIC_APK_URL = "   ";
    expect(apkUrl()).toBeNull();
  });

  it("trims a value with surrounding whitespace rather than breaking the link", () => {
    process.env.NEXT_PUBLIC_APK_URL = "  https://example.com/a.apk\n";
    expect(apkUrl()).toBe("https://example.com/a.apk");
  });
});

describe("apkFallbackUrl and apkSizeLabel", () => {
  it("are null when unset, so the UI omits them entirely", () => {
    expect(apkFallbackUrl()).toBeNull();
    expect(apkSizeLabel()).toBeNull();
  });

  it("return their configured values", () => {
    process.env.NEXT_PUBLIC_APK_FALLBACK_URL = "https://github.com/x/releases/latest";
    process.env.NEXT_PUBLIC_APK_SIZE = "89 MB";
    expect(apkFallbackUrl()).toBe("https://github.com/x/releases/latest");
    expect(apkSizeLabel()).toBe("89 MB");
  });
});

describe("apkQrUrl", () => {
  it("encodes the target so query strings survive", () => {
    const qr = apkQrUrl("https://example.com/a.apk?v=1&x=2");
    expect(qr).toContain(encodeURIComponent("https://example.com/a.apk?v=1&x=2"));
    // The ampersand from the target must not leak into the QR service's own
    // query string, or the QR encodes a truncated URL.
    expect(qr.split("data=")[1]).not.toContain("&");
  });
});
