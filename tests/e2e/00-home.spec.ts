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

  test("keeps the hero photo local and its backdrop free of competing imagery", async ({
    page,
  }) => {
    await page.goto("/");
    const hero = page.locator("section").first();
    const contentImage = hero.locator("img[src*='ykay-students']").first();
    await expect(contentImage).toBeAttached();
    const imageUrl = await contentImage.getAttribute("src");
    expect(imageUrl).toBe("/home/ykay-students-750.webp");

    // The low-contrast decorative backdrop was removed from the critical path;
    // only the student portrait remains as an above-the-fold image.
    await expect(hero.locator("[style*='hero-campus']")).toHaveCount(0);
  });
});
