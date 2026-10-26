// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AuthProvider, useAuth } from "@/components/AuthProvider";

const fetchMock = vi.fn<typeof fetch>();
const replaceMock = vi.fn();
let container: HTMLDivElement | null = null;
let root: Root | null = null;

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function SignOutButton() {
  const { logout, logoutHref, user } = useAuth();
  return createElement(
    "div",
    null,
    // Mirrors the real controls: an anchor that signs out by navigation when
    // JavaScript is unavailable, and opens the dialog when it is.
    createElement(
      "a",
      {
        href: logoutHref,
        onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
          event.preventDefault();
          logout();
        },
      },
      "Sign out",
    ),
    createElement("span", { "data-testid": "session-user" }, user?.name ?? "Signed out"),
  );
}

function linkNamed(name: string) {
  return Array.from(container?.querySelectorAll<HTMLAnchorElement>("a") ?? []).find(
    (link) => link.textContent?.trim() === name,
  );
}

function buttonNamed(name: string) {
  return Array.from(container?.querySelectorAll<HTMLButtonElement>("button") ?? []).find(
    (button) => button.textContent?.trim() === name,
  );
}

/**
 * Sign-out is a navigation, not a fetch.
 *
 * The client used to POST /api/auth/logout, wait up to ten seconds for JSON,
 * and only then leave — so a cold function or a slow database left the dialog
 * stuck on "The server did not confirm that your session was revoked" even
 * though the cookie had already been cleared. The browser now navigates to the
 * route, which revokes, clears the cookie and answers with a redirect in a
 * single response.
 *
 * jsdom implements neither assignment to location nor navigation, so location
 * is replaced with a spy; that is also what makes "did the client navigate?"
 * observable.
 */
beforeEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...window.location,
      replace: replaceMock,
      assign: replaceMock,
      href: "http://localhost/",
    },
  });
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = null;
  }
  container?.remove();
  container = null;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function renderProvider(userPayload: unknown) {
  fetchMock.mockImplementation((input) => {
    if (input === "/api/auth/me") {
      return Promise.resolve({
        ok: Boolean(userPayload),
        status: userPayload ? 200 : 401,
        json: async () => ({ user: userPayload }),
      } as Response);
    }
    return Promise.reject(new Error(`Unexpected fetch: ${String(input)}`));
  });
  vi.stubGlobal("fetch", fetchMock);
  container = document.createElement("div");
  document.body.append(container);
  act(() => {
    root = createRoot(container!);
    root.render(createElement(AuthProvider, null, createElement(SignOutButton)));
  });
}

describe("portal sign-out flow", () => {
  it("renders a real href, so sign-out survives a bundle that never hydrated", async () => {
    renderProvider({
      id: "teacher_1",
      name: "Teacher One",
      email: "teacher@example.test",
      role: "TEACHER",
    });
    await act(async () => Promise.resolve());

    // This attribute is the whole fallback: no handler has to run for the
    // browser to reach /api/auth/logout, which answers with the redirect.
    expect(linkNamed("Sign out")?.getAttribute("href")).toBe("/api/auth/logout?role=TEACHER");
  });

  it("omits the role hint for a signed-out visitor instead of sending an empty one", async () => {
    renderProvider(null);
    await act(async () => Promise.resolve());
    expect(linkNamed("Sign out")?.getAttribute("href")).toBe("/api/auth/logout");
  });

  it("does not navigate on click when the dialog can still ask", async () => {
    renderProvider({
      id: "teacher_1",
      name: "Teacher One",
      email: "teacher@example.test",
      role: "TEACHER",
    });
    await act(async () => Promise.resolve());
    await act(async () => linkNamed("Sign out")?.click());

    expect(container!.querySelector('[role="dialog"]')).not.toBeNull();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("asks for confirmation and navigates to the logout route on confirm", async () => {
    renderProvider({
      id: "teacher_1",
      name: "Teacher One",
      email: "teacher@example.test",
      role: "TEACHER",
    });

    await act(async () => linkNamed("Sign out")?.click());
    const dialog = container!.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.textContent).toContain("Sign out?");
    expect(dialog?.textContent).toContain("Teacher One");
    expect(document.activeElement).toBe(buttonNamed("Stay signed in"));

    expect(replaceMock).not.toHaveBeenCalled();
    await act(async () => buttonNamed("Yes, sign me out")?.click());

    // One navigation, carrying the role so the server can pick the right
    // sign-in page. No fetch to /api/auth/logout from the browser.
    expect(replaceMock).toHaveBeenCalledWith("/api/auth/logout?role=TEACHER");
    expect(fetchMock).not.toHaveBeenCalledWith("/api/auth/logout", expect.anything());
  });

  it("keeps the session active when confirmation is canceled", async () => {
    renderProvider({
      id: "teacher_1",
      name: "Teacher One",
      email: "teacher@example.test",
      role: "TEACHER",
    });
    await act(async () => Promise.resolve());
    expect(container!.querySelector('[data-testid="session-user"]')?.textContent).toBe(
      "Teacher One",
    );

    await act(async () => linkNamed("Sign out")?.click());
    await act(async () => buttonNamed("Stay signed in")?.click());

    expect(container!.querySelector('[role="dialog"]')).toBeNull();
    expect(container!.querySelector('[data-testid="session-user"]')?.textContent).toBe(
      "Teacher One",
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("does not use fetch for sign-out at all — that was the failure mode", async () => {
    renderProvider(null);
    await act(async () => linkNamed("Sign out")?.click());
    await act(async () => buttonNamed("Yes, sign me out")?.click());

    const logoutCalls = fetchMock.mock.calls.filter(([input]) => input === "/api/auth/logout");
    expect(logoutCalls).toHaveLength(0);
    expect(replaceMock).toHaveBeenCalledWith("/api/auth/logout");
  });
});
