import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { ACCOUNTS, apiLogin, type Role } from "./helpers";

const APP_ROOT = resolve(process.cwd(), "app");
const PORTAL_ROOTS: Record<string, Role> = {
  admin: "admin",
  "admin-admissions": "admin",
  teacher: "teacher",
  student: "student",
  parent: "parent",
  "super-admin": "superadmin",
  "it-portal": "itstudent",
  staff: "teacher",
};

const TEST_LOGIN_IPS: Record<Role, string> = {
  superadmin: "198.51.100.91",
  admin: "198.51.100.92",
  director: "198.51.100.93",
  bursar: "198.51.100.94",
  coordinator: "198.51.100.95",
  hod: "198.51.100.96",
  teacher: "198.51.100.97",
  student: "198.51.100.98",
  parent: "198.51.100.99",
  itstudent: "203.0.113.91",
};

const API_ROLE_BY_PREFIX: Record<string, Role> = {
  admin: "admin",
  admissions: "admin",
  auth: "admin",
  cbt: "student",
  contact: "admin",
  health: "admin",
  internal: "admin",
  it: "itstudent",
  jobs: "admin",
  me: "admin",
  messages: "teacher",
  mobile: "student",
  news: "student",
  notifications: "student",
  onboarding: "admin",
  parent: "parent",
  payments: "admin",
  platform: "superadmin",
  push: "student",
  staff: "teacher",
  student: "student",
  "super-admin": "superadmin",
  teacher: "teacher",
};

// GET normally means read-only. Two exceptions:
//   * the legacy cron endpoint aliases GET to a notification dispatcher;
//   * sign-out is a browser navigation answered in one response, so a GET there
//     revokes the account's sessions. Hammering it here signed the shared admin
//     cookie out from under every later test.
// Never execute either in a route smoke.
const SIDE_EFFECTFUL_GET_ENDPOINTS = new Set([
  "/api/jobs/dispatch-notifications",
  "/api/auth/logout",
]);

type RouteFile = { path: string; role: Role; dynamic: boolean };

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function routeSegments(path: string) {
  return path.split(sep).filter(Boolean);
}

function routePath(file: string, root: string, base: string): RouteFile {
  const relativeFile = relative(root, file);
  const segments = routeSegments(relativeFile.replace(/(?:page|route)\.tsx?$/, ""));
  const dynamic = segments.some((segment) => segment.startsWith("[") && segment.endsWith("]"));
  const concreteSegments = segments.map((segment) =>
    segment.startsWith("[") && segment.endsWith("]") ? "__arena_missing__" : segment,
  );
  const path = `${base}/${concreteSegments.join("/")}`.replace(/\/$/, "") || "/";
  return { path, role: "admin", dynamic };
}

function collectPortalPages(): RouteFile[] {
  return Object.entries(PORTAL_ROOTS)
    .flatMap(([rootName, role]) => {
      const root = resolve(APP_ROOT, rootName);
      return filesUnder(root)
        .filter((file) => /(?:^|[/\\])page\.tsx?$/.test(file))
        .map((file) => {
          const route = routePath(file, APP_ROOT, "");
          return { ...route, role, path: route.path || "/" };
        });
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function collectReadApiRoutes(): RouteFile[] {
  const apiRoot = resolve(APP_ROOT, "api");
  return filesUnder(apiRoot)
    .filter((file) => /(?:^|[/\\])route\.tsx?$/.test(file))
    .filter((file) =>
      /export\s+(?:async\s+)?function\s+GET\b|export\s+(?:const|let)\s+GET\b/.test(
        readFileSync(file, "utf8"),
      ),
    )
    .map((file) => {
      const route = routePath(file, apiRoot, "/api");
      const prefix = route.path.split("/")[2] || "";
      return { ...route, role: API_ROLE_BY_PREFIX[prefix] || "admin" };
    })
    .filter((route) => !SIDE_EFFECTFUL_GET_ENDPOINTS.has(route.path))
    .sort((left, right) => left.path.localeCompare(right.path));
}

async function installRoleCookie(context: BrowserContext, role: Role, cookieHeader: string) {
  await context.addCookies([
    {
      name: "ykay_session",
      value: cookieHeader.replace(/^ykay_session=/, ""),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  expect(ACCOUNTS[role]).toContain("@ykaycollege.com");
}

async function signInForRouteSmoke(
  page: Page,
  context: BrowserContext,
  request: Parameters<typeof apiLogin>[0],
  role: Role,
) {
  const cookie = await apiLogin(request, role, { forwardedFor: TEST_LOGIN_IPS[role] });
  await installRoleCookie(context, role, cookie);
  await page.setDefaultNavigationTimeout(12_000);
}

function pagePathFor(file: string, rootName: string): string {
  const root = resolve(APP_ROOT, rootName);
  const relativeFile = relative(root, file);
  const segments = routeSegments(relativeFile.replace(/(?:^|[/\\])page\.tsx?$/, ""));
  return `/${[rootName, ...segments]
    .map((segment) =>
      segment.startsWith("[") && segment.endsWith("]") ? "__arena_missing__" : segment,
    )
    .join("/")}`;
}

/**
 * Visit a route, tolerating one superseded navigation.
 *
 * These pages redirect on the client (a redirect shim, or a router.push after
 * a fetch), and that redirect can land while the next `page.goto` is in
 * flight. Chromium reports it either as net::ERR_ABORTED or as
 * `Navigation to "X" is interrupted by another navigation to "Y"` — both mean
 * the browser discarded a navigation it had already started, not that the
 * route is broken. Retrying once tells that apart from a route that never
 * settles: a genuinely broken page is superseded again and still fails.
 */
async function visitRoute(page: Page, path: string) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await page.goto(path, { waitUntil: "domcontentloaded" });
    } catch (error) {
      const superseded =
        error instanceof Error &&
        /ERR_ABORTED|interrupted by another navigation/i.test(error.message);
      if (!superseded || attempt >= 2) throw error;
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    }
  }
}

const PORTAL_PAGES = collectPortalPages();
const READ_API_ROUTES = collectReadApiRoutes();

test.describe("seeded role and route smoke", () => {
  test.setTimeout(240_000);

  test("each seeded user role can reach every portal page route", async ({
    page,
    context,
    request,
  }) => {
    expect(PORTAL_PAGES.length, "portal page route inventory unexpectedly shrank").toBeGreaterThan(
      70,
    );
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    for (const [rootName, role] of Object.entries(PORTAL_ROOTS)) {
      await signInForRouteSmoke(page, context, request, role);
      const root = resolve(APP_ROOT, rootName);
      const rolePages = filesUnder(root)
        .filter((file) => /(?:^|[/\\])page\.tsx?$/.test(file))
        .map((file) => pagePathFor(file, rootName));

      for (const path of rolePages) {
        const response = await visitRoute(page, path);
        const status = response?.status() ?? 0;
        expect(status < 500 || status === 503, `${role} route ${path} returned ${status}`).toBe(
          true,
        );
        expect(
          new URL(page.url()).pathname,
          `${role} route ${path} redirected to sign-in`,
        ).not.toBe("/login");
      }
    }

    expect(pageErrors, "portal pages raised browser-side exceptions").toEqual([]);
  });

  test("read-only API routes do not crash under their seeded role sessions", async ({
    request,
  }) => {
    expect(READ_API_ROUTES.length, "read API route inventory unexpectedly shrank").toBeGreaterThan(
      70,
    );
    const failures: string[] = [];

    for (const route of READ_API_ROUTES) {
      try {
        const cookie = await apiLogin(request, route.role, {
          forwardedFor: TEST_LOGIN_IPS[route.role],
        });
        const response = await request.get(route.path, {
          headers: { cookie },
          timeout: 10_000,
        });
        const status = response.status();
        // 503 is allowed in the explicitly temporary CI environment for an
        // integration-backed read. 500/502/504 indicate an unhandled route
        // failure; ordinary auth, validation, not-found and rate-limit codes
        // are reported by the route itself and remain visible in the trace.
        if (status >= 500 && status !== 503) failures.push(`${route.path} -> ${status}`);
      } catch (error) {
        failures.push(`${route.path} -> ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    expect(
      failures,
      `read-route failures (the notification dispatcher GET is intentionally excluded):\n${failures.join("\n")}`,
    ).toEqual([]);
  });
});
