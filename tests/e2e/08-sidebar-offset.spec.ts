import { expect, test } from "@playwright/test";
import { useSession } from "./helpers";

const PORTAL_PAGES = [
  { path: "/student/attendance", role: "student" as const },
  { path: "/teacher/dashboard", role: "teacher" as const },
  { path: "/parent/dashboard", role: "parent" as const },
  { path: "/admin", role: "admin" as const },
  { path: "/super-admin", role: "superadmin" as const },
  { path: "/it-portal/dashboard", role: "itstudent" as const },
];

async function measureOffset(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const sidebar = document.querySelector<HTMLElement>('aside[data-portal-sidebar="true"]');
    const main = document.querySelector<HTMLElement>("main");
    const firstSection = main?.querySelector<HTMLElement>(":scope > section");
    if (!sidebar || !main || !firstSection)
      throw new Error("Portal layout elements were not rendered");
    const rail = sidebar.getBoundingClientRect();
    const content = firstSection.getBoundingClientRect();
    return {
      paddingLeft: getComputedStyle(main).paddingLeft,
      sidebarRight: rail.right,
      contentLeft: content.left,
    };
  });
}

test.describe("portal sidebar content offset", () => {
  test("content clears the fixed sidebar across role portals and dock states", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const portal of PORTAL_PAGES) {
      await useSession(context, page, portal.role);
      await page.goto(portal.path, { waitUntil: "domcontentloaded" });
      // measureOffset() deliberately measures the first aside in the DOM; some
      // portals keep the server-rendered shell in the document alongside the
      // hydrated tree, and asserting on the whole set trips strict mode for a
      // reason that says nothing about the layout under test.
      const sidebar = page.locator('aside[data-portal-sidebar="true"]').first();
      await expect(sidebar, `${portal.role} sidebar on ${portal.path}`).toBeVisible();
      await expect(page.locator("main").first().locator(":scope > section").first()).toBeVisible();

      const expanded = await measureOffset(page);
      expect(expanded.paddingLeft, `${portal.role} expanded inset`).toBe("296px");
      expect(
        expanded.contentLeft,
        `${portal.role} content overlaps the sidebar`,
      ).toBeGreaterThanOrEqual(expanded.sidebarRight + 7);
    }

    // The student attendance page from the reported screenshot is the
    // regression anchor for the collapse state and mobile overlay behavior.
    await useSession(context, page, "student");
    await page.goto("/student/attendance", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Collapse Student sidebar" }).click();
    await expect
      .poll(() =>
        page
          .locator("main")
          .first()
          .evaluate((element) => getComputedStyle(element).paddingLeft),
      )
      .toBe("104px");
    // The rail animates `lg:transition-[width] lg:duration-200` while the
    // main padding flips immediately, so waiting only on the padding measures
    // the rail mid-transition and reports a false overlap. Wait for the
    // collapsed width itself (80px) before comparing.
    await expect
      .poll(() =>
        page
          .locator('aside[data-portal-sidebar="true"]')
          .first()
          .evaluate((element) => Math.round(element.getBoundingClientRect().width)),
      )
      .toBe(80);
    const collapsed = await measureOffset(page);
    expect(collapsed.contentLeft).toBeGreaterThanOrEqual(collapsed.sidebarRight + 7);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page
          .locator("main")
          .first()
          .evaluate((element) => getComputedStyle(element).paddingLeft),
      )
      .toBe("0px");
  });
});
