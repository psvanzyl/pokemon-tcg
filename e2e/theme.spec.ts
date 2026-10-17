import { expect, test } from "@playwright/test";

test.describe("theme", () => {
  test("light is the default and the switcher cycles light/dark/system", async ({ page }) => {
    await page.goto("/");

    // default: no stored choice, no OS preference -> light
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.getByTestId("theme-light")).toHaveAttribute("aria-pressed", "true");

    await page.getByTestId("theme-dark").click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");

    // the choice survives a reload
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByTestId("theme-light").click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    // system follows the OS preference
    await page.emulateMedia({ colorScheme: "dark" });
    await page.getByTestId("theme-system").click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("the mark is a Poké Ball: red top, white bottom, black equator", async ({ page }) => {
    await page.goto("/");
    const logo = page.locator('header svg[aria-label="Carddex"]');
    await expect(logo).toBeVisible();

    // the clipped hemisphere fills must be present in the rendered markup
    await expect(logo.locator('rect[fill="#e3342f"]')).toHaveCount(1);
    await expect(logo.locator('rect[fill="#ffffff"]')).toHaveCount(1);
    await expect(logo.locator('rect[fill="#111114"]')).toHaveCount(1);
  });
});
