import { describe, expect, it, vi } from "vitest";
import { DEFAULT_VIRTUAL_URL, virtualBaseUrl } from "@/lib/virtual-url";

/** UX-01: the /sso/virtual handoff destination must be a safe https origin. */
describe("virtualBaseUrl", () => {
  it("defaults to the production Virtual origin", () => {
    expect(virtualBaseUrl({})).toBe(DEFAULT_VIRTUAL_URL);
  });

  it("accepts a configured https origin and strips path/query", () => {
    expect(
      virtualBaseUrl({ NEXT_PUBLIC_VIRTUAL_URL: "https://virtual.example.ng/login?x=1" }),
    ).toBe("https://virtual.example.ng");
  });

  it("rejects non-https remote URLs (downgrade / open-redirect hygiene)", () => {
    expect(virtualBaseUrl({ NEXT_PUBLIC_VIRTUAL_URL: "http://evil.example.com" })).toBe(
      DEFAULT_VIRTUAL_URL,
    );
    expect(virtualBaseUrl({ NEXT_PUBLIC_VIRTUAL_URL: "javascript:alert(1)" })).toBe(
      DEFAULT_VIRTUAL_URL,
    );
    expect(virtualBaseUrl({ NEXT_PUBLIC_VIRTUAL_URL: "not a url" })).toBe(DEFAULT_VIRTUAL_URL);
  });

  it("allows http only for local development", () => {
    expect(virtualBaseUrl({ NEXT_PUBLIC_VIRTUAL_URL: "http://localhost:8080" })).toBe(
      "http://localhost:8080",
    );
  });

  it("redirects to the configured origin without forwarding credentials or query params", async () => {
    vi.stubEnv("NEXT_PUBLIC_VIRTUAL_URL", "https://virtual.example.ng/login?keep=no");
    const { GET } = await import("@/app/sso/virtual/route");
    const response = await GET();
    const location = response.headers.get("location");

    expect(response.status).toBe(307);
    expect(location).toBe("https://virtual.example.ng/");
    expect(location).not.toContain("token");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("cache-control")).toContain("no-store");
    vi.unstubAllEnvs();
  });
});
