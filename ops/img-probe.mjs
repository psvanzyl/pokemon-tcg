import { chromium } from "@playwright/test";
const B = process.env.BASE || "https://pokemon.laserraptorai.duckdns.org";
const email = process.env.QA_EMAIL || "carddex-qa@laserraptorai.duckdns.org";
const password = process.env.QA_PASSWORD || "QaCarddex2026!";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
await page.goto(B + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1000);
await page.locator('form input[type="email"]').fill(email);
await page.locator('form input[type="password"]').fill(password);
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(4000);

for (const url of ["/", "/account", "/kaart/84198"]) {
  await page.goto(B + url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  const imgs = await page.evaluate(() =>
    [...document.querySelectorAll("img")].slice(0, 8).map((i) => ({
      src: i.currentSrc || i.src,
      w: i.naturalWidth,
      h: i.naturalHeight,
      host: (() => { try { return new URL(i.currentSrc || i.src).host; } catch { return "?"; } })(),
    })),
  );
  console.log(`\n=== ${url} (${imgs.length} imgs) ===`);
  for (const i of imgs) console.log(`  ${i.w}x${i.h} ${i.host}  ${i.src.slice(0, 110)}`);
}
await browser.close();
