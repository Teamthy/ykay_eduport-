import { test, expect } from "@playwright/test";

/**
 * Public marketing home — no auth, no seed. Proves the Ykay College landing
 * (not the platform shell) is what a visitor sees.
 */
test.describe("college home", () => {
  test("renders the Ykay College hero, not the platform shell", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("body")).not.toContainText(/EDUos platform/i);
    await expect(page.getByRole("heading", { name: /Excellence in Education/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Apply Now/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Student Portal/i }).first()).toBeVisible();
  });

  test("hero uses a real campus photograph, not a remote placeholder", async ({ page }) => {
    await page.goto("/");
    // The backdrop is a CSS background rather than an <img> so that a
    // 20%-opacity decoration cannot be the LCP element. What this test cares
    // about is unchanged: the photograph is the local asset, not a remote
    // placeholder, and the content image is still a real <img>.
    const backdrop = page.locator("section div[style*='hero-campus']");
    await expect(backdrop).toHaveCount(1);
    const backgroundImage = await backdrop.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    );
    // getComputedStyle resolves the URL against the document origin, so match
    // the path and assert the host is this app rather than a remote placeholder.
    expect(backgroundImage).toContain("/home/hero-campus-750.webp");
    expect(backgroundImage).not.toMatch(/url\("?https:\/\/(?!localhost)/);

    await expect(page.locator("section img[src*='ykay-students']").first()).toBeAttached();
  });
});
