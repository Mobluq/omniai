import { expect, test } from "@playwright/test";

const publicPaths = [
  "/",
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/forgot-password",
  "/auth/verify-email",
  "/auth/reset-password?email=test%40example.com&token=abcdefghijklmnopqrstuvwxyz1234567890abcdef",
];

for (const path of publicPaths) {
  test(`mobile public page has no horizontal overflow: ${path}`, async ({ page }) => {
    await page.goto(path);

    const overflow = await page.evaluate(() => {
      const width = window.innerWidth;
      return document.documentElement.scrollWidth > width || document.body.scrollWidth > width;
    });

    await expect(page.locator("body")).toBeVisible();
    expect(overflow).toBe(false);
  });
}
