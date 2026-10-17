import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Defaults to the deployed site; pass BASE=http://127.0.0.1:3001 for a local build.
const B = process.env.BASE || "https://pokemon.laserraptorai.duckdns.org";
const OUT = process.env.OUT || "/tmp/carddex-live";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const results = [];
const check = (n, ok, extra = "") => {
  results.push([n, ok, extra]);
  console.log(`${ok ? "PASS" : "FAIL"} ${n}${extra ? " — " + extra : ""}`);
};

// desktop, untouched profile -> must be light
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: "dark" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(B + "/", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(6000);
  check("default is light even when the OS prefers dark", !(await page.evaluate(() => document.documentElement.classList.contains("dark"))));
  check("body background is white", (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === "rgb(255, 255, 255)");
  await expect_(page.locator('header svg[aria-label="Carddex"]'), "Poké Ball mark in the header");
  await page.screenshot({ path: `${OUT}/live-home-light.png` });
  await page.screenshot({ path: `${OUT}/live-header-light.png`, clip: { x: 0, y: 0, width: 1440, height: 56 } });

  await page.getByTestId("theme-dark").click();
  await page.waitForTimeout(600);
  check("dark click applies .dark", await page.evaluate(() => document.documentElement.classList.contains("dark")));
  check("body background is near-black", (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === "rgb(7, 10, 16)");
  await page.screenshot({ path: `${OUT}/live-home-dark.png` });

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(4000);
  check("dark persists across reload", await page.evaluate(() => document.documentElement.classList.contains("dark")));

  await page.goto(B + "/kaart/84198", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/live-detail-dark.png` });
  await page.getByTestId("theme-light").click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/live-detail-light.png` });
  check("no uncaught JS errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// mobile light
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light" });
  const page = await ctx.newPage();
  await page.goto(B + "/sets", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/live-sets-mobile-light.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("mobile /sets has no horizontal overflow", overflow <= 2, `${overflow}px`);
  const wrapped = await page.$$eval("tbody tr td:nth-child(3)", (tds) =>
    tds.slice(0, 25).filter((td) => {
      const r = document.createRange();
      r.selectNodeContents(td);
      return r.getClientRects().length > 1;
    }).length,
  );
  check("mobile /sets dates are single-line", wrapped === 0, `wrapped=${wrapped}`);
  await page.goto(B + "/", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${OUT}/live-home-mobile-light.png` });
  await page.screenshot({ path: `${OUT}/live-mobile-header.png`, clip: { x: 0, y: 0, width: 390, height: 56 } });
  await ctx.close();
}

await browser.close();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} live checks passed`);
process.exit(failed.length ? 1 : 0);

async function expect_(locator, name) {
  check(`${name} is visible`, await locator.first().isVisible().catch(() => false));
}
