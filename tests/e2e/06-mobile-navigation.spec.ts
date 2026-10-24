import { test, expect } from "@playwright/test";
import { useSession } from "./helpers";

test.describe("mobile navigation", () => {
  test("public home uses a compact accordion menu and keeps its primary action reachable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const menu = page.getByRole("button", { name: "Open menu" });
    await expect(menu).toBeVisible();
    await menu.click();
    const navigation = page.getByRole("navigation", { name: "Main navigation" });
    await expect(navigation).toBeVisible();
    // The desktop header also contains an Apply Now CTA. Scope to the opened
    // mobile navigation so strict mode checks the intended, reachable action.
    await expect(navigation.getByRole("link", { name: "Apply Now" })).toBeVisible();

    const aboutToggle = page.getByRole("button", { name: "Show About links" });
    await expect(page.getByRole("link", { name: "Our Story" })).toHaveCount(0);
    await aboutToggle.click();
    await expect(page.getByRole("link", { name: "Our Story" })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);
  });

  test("admin navigation opens as a mobile drawer instead of disappearing", async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await useSession(context, page, "admin");
    await page.goto("/admin");

    const menu = page.getByRole("button", { name: "Open Admin navigation" });
    await expect(menu).toBeVisible();
    await menu.click();
    const drawer = page.getByRole("dialog", { name: "Admin navigation" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "School Profile" })).toBeVisible();
  });
});
