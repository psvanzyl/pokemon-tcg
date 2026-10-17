import { expect, test } from "@playwright/test";

test.describe("catalogue smoke", () => {
  test("home loads, catalogue renders cards with prices", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "complete English Pokémon card index",
    );

    // wait for the catalogue to hydrate and paint tiles
    const tiles = page.locator('a[href^="/kaart/"]');
    await expect(tiles.first()).toBeVisible({ timeout: 30_000 });
    expect(await tiles.count()).toBeGreaterThan(20);

    // a price badge is present on at least one tile
    await expect(page.locator("text=/\\$\\d/").first()).toBeVisible();

    expect(errors, `uncaught JS errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("search narrows the result set", async ({ page }) => {
    await page.goto("/");
    const count = page.locator("strong.tabular-nums").first();
    await expect(count).toBeVisible({ timeout: 30_000 });
    const before = await count.innerText();

    await page.getByPlaceholder(/Search 28,000/).fill("charizard");
    await page.waitForTimeout(700);

    const after = await count.innerText();
    expect(Number(after.replace(/,/g, ""))).toBeLessThan(Number(before.replace(/,/g, "")));
    expect(Number(after.replace(/,/g, ""))).toBeGreaterThan(10);

    await expect(page.locator('a[href^="/kaart/"]').first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/charizard/i);
  });

  test("filters and sorting work and land in the URL", async ({ page }) => {
    await page.goto("/?rar=Secret%20Rare&sort=price-desc");
    await expect(page.locator('a[href^="/kaart/"]').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("body")).toContainText("Secret Rare");

    // price-desc: first tile price >= second tile price
    const prices = await page
      .locator('a[href^="/kaart/"] .text-poke-gold')
      .allInnerTexts();
    const nums = prices
      .slice(0, 6)
      .map((t) => Number(t.replace(/[^0-9.]/g, "")))
      .filter((n) => !Number.isNaN(n));
    expect(nums.length).toBeGreaterThan(2);
    const sorted = [...nums].sort((a, b) => b - a);
    expect(nums).toEqual(sorted);
  });

  test("card detail page shows price table and metadata", async ({ page }) => {
    await page.goto("/?q=charizard");
    const first = page.locator('a[href^="/kaart/"]').first();
    await expect(first).toBeVisible({ timeout: 30_000 });
    await first.click();

    await expect(page).toHaveURL(/\/kaart\/\d+/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Market price/i);
    await expect(page.locator("body")).toContainText(/Prices by print/i);
    await expect(page.locator("body")).toContainText(/Price history/i);
    await expect(page.locator("body")).toContainText(/TCGplayer/i);
  });

  test("sets page lists sets and links into the catalogue", async ({ page }) => {
    await page.goto("/sets");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Sets");
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(100);
  });

  test("about page explains the method", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("About");
    await expect(page.locator("body")).toContainText("TCGCSV");
  });

  test("no horizontal overflow on the current viewport", async ({ page }) => {
    for (const path of ["/", "/sets", "/about"]) {
      await page.goto(path);
      await page.waitForTimeout(1500);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow on ${path}: ${overflow}px`).toBeLessThanOrEqual(2);
    }
  });
});
