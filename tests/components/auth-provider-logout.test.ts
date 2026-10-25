// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AuthProvider, signInPathForRole, useAuth } from "@/components/AuthProvider";

const fetchMock = vi.fn<typeof fetch>();
let container: HTMLDivElement | null = null;
let root: Root | null = null;

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function SignOutButton() {
  const { logout, user } = useAuth();
  return createElement(
    "div",
    null,
    createElement("button", { type: "button", onClick: logout }, "Sign out"),
    createElement("span", { "data-testid": "session-user" }, user?.name ?? "Signed out"),
  );
}

function buttonNamed(name: string) {
  return Array.from(container?.querySelectorAll<HTMLButtonElement>("button") ?? []).find(
    (button) => button.textContent?.trim() === name,
  );
}

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = null;
  }
  container?.remove();
  container = null;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("portal sign-out flow", () => {
  it("opens an accessible confirmation and posts the logout request after confirmation", async () => {
    fetchMock.mockImplementation((input) => {
      if (input === "/api/auth/me") {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ user: null }),
        } as Response);
      }
      if (input === "/api/auth/logout") {
        // Keep the request pending so the test can assert the visible busy
        // state without triggering a full-page navigation in jsdom.
        return new Promise<Response>(() => {});
      }
      return Promise.reject(new Error(`Unexpected fetch: ${String(input)}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    container = document.createElement("div");
    document.body.append(container);

    await act(async () => {
      root = createRoot(container!);
      root.render(createElement(AuthProvider, null, createElement(SignOutButton)));
    });

    await act(async () => buttonNamed("Sign out")?.click());
    const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.textContent).toContain("Sign out?");
    expect(document.activeElement).toBe(buttonNamed("Stay signed in"));

    vi.useFakeTimers();
    await act(async () => buttonNamed("Yes, sign me out")?.click());
    await act(async () => Promise.resolve());

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        cache: "no-store",
        keepalive: true,
      }),
    );
    expect(buttonNamed("Signing out…")?.hasAttribute("disabled")).toBe(true);
  });

  it("keeps the session active when confirmation is canceled", async () => {
    fetchMock.mockImplementation((input) => {
      if (input === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            user: {
              id: "teacher_1",
              name: "Teacher One",
              email: "teacher@example.test",
              role: "TEACHER",
            },
          }),
        } as Response);
      }
      return Promise.reject(new Error(`Unexpected fetch: ${String(input)}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    container = document.createElement("div");
    document.body.append(container);

    await act(async () => {
      root = createRoot(container!);
      root.render(createElement(AuthProvider, null, createElement(SignOutButton)));
    });
    expect(container.querySelector('[data-testid="session-user"]')?.textContent).toBe(
      "Teacher One",
    );

    await act(async () => buttonNamed("Sign out")?.click());
    expect(container.textContent).toContain("You're signed in as Teacher One");
    await act(async () => buttonNamed("Stay signed in")?.click());

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('[data-testid="session-user"]')?.textContent).toBe(
      "Teacher One",
    );
    expect(fetchMock).not.toHaveBeenCalledWith("/api/auth/logout", expect.anything());
  });

  it("routes signed-out users back to the appropriate portal sign-in context", () => {
    expect(signInPathForRole("TEACHER")).toBe("/login?portal=staff");
    expect(signInPathForRole("ADMIN")).toBe("/login?portal=staff");
    expect(signInPathForRole("STUDENT")).toBe("/login?portal=student");
    expect(signInPathForRole("PARENT")).toBe("/login?portal=parent");
    expect(signInPathForRole("IT_STUDENT")).toBe("/it-portal/auth");
  });

  it("does not claim sign-out when the backend cannot confirm revocation", async () => {
    fetchMock.mockImplementation((input) => {
      if (input === "/api/auth/me") {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ user: null }),
        } as Response);
      }
      if (input === "/api/auth/logout") {
        return Promise.resolve({
          ok: false,
          status: 503,
          json: async () => ({ ok: false }),
        } as Response);
      }
      return Promise.reject(new Error(`Unexpected fetch: ${String(input)}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    container = document.createElement("div");
    document.body.append(container);

    await act(async () => {
      root = createRoot(container!);
      root.render(createElement(AuthProvider, null, createElement(SignOutButton)));
    });
    await act(async () => buttonNamed("Sign out")?.click());
    await act(async () => buttonNamed("Yes, sign me out")?.click());

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    expect(container.textContent).toContain(
      "The server did not confirm that your session was revoked",
    );
    expect(buttonNamed("Yes, sign me out")?.disabled).toBe(false);
  });
});
