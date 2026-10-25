import { describe, expect, it } from "vitest";
import { apiErrorMessage, readJsonResponse } from "@/lib/api-response";

describe("safe JSON API responses", () => {
  it("reads a valid JSON body", async () => {
    const payload = await readJsonResponse<{ ok: boolean }>(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    expect(payload).toEqual({ ok: true });
  });

  it("returns a useful error for an empty success body", async () => {
    await expect(readJsonResponse(new Response("", { status: 200 }))).rejects.toThrow(
      "empty response",
    );
  });

  it("includes the status for an empty error body", async () => {
    await expect(readJsonResponse(new Response("", { status: 503 }))).rejects.toThrow("HTTP 503");
  });

  it("does not expose native JSON parse errors for HTML or truncated responses", async () => {
    await expect(
      readJsonResponse(new Response("<html>error</html>", { status: 500 })),
    ).rejects.toThrow("unreadable error (HTTP 500)");
    await expect(readJsonResponse(new Response('{"partial":', { status: 200 }))).rejects.toThrow(
      "unreadable data",
    );
  });

  it("rejects JSON null and safely selects server-provided error messages", async () => {
    await expect(readJsonResponse(new Response("null"))).rejects.toThrow("unreadable data");
    expect(apiErrorMessage({ error: "Unavailable" }, "Fallback")).toBe("Unavailable");
    expect(apiErrorMessage({}, "Fallback")).toBe("Fallback");
  });
});
