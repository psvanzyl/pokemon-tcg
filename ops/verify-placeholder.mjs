// Live verification of the missing-scan placeholder (CardImage).
// Run from /root/projects/pokemon-tcg/app on CT141: node ops/verify-placeholder.mjs
import { chromium } from "playwright";

const BASE = "https://pokemon.laserraptorai.duckdns.org";
const DEAD = [84187, 2545];   // Charizard (promo) / Gengar SWSH241 — no scan on the CDN
const LIVE = [84198];         // a card with a working scan — must be untouched
const OUT = "/tmp/verify-placeholder";
const fs = await import("node:fs");
fs.mkdirSync(OUT, { recursive: true });

const probe = async (page) => page.evaluate(() => {
  const imgs = [...document.images];
  return {
    placeholders: document.querySelectorAll('span[role="img"][aria-label*="no scan available"]').length,
    ariaHiddenPlaceholders: document.querySelectorAll('span[aria-hidden="true"] > svg').length,
    broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
    loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
    totalImgs: imgs.length,
  };
});

const browser = await chromium.launch();
const results = {};

for (const [label, ids, viewport] of [
  ["desktop", DEAD, { width: 1440, height: 900 }],
  ["mobile", DEAD, { width: 390, height: 844 }],
]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const id of ids) {
    await page.goto(`${BASE}/kaart/${id}`, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(2500); // give onError time to fire
    const r = await probe(page);
    results[`${label}:/kaart/${id}`] = r;
    await page.screenshot({ path: `${OUT}/kaart-${id}-${label}.png`, fullPage: false });
  }
  await ctx.close();
}

// Sanity: a card WITH a scan must still render its image and show no placeholder.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/kaart/${LIVE[0]}`, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2000);
  results[`desktop:/kaart/${LIVE[0]}`] = await probe(page);
  await page.screenshot({ path: `${OUT}/kaart-${LIVE[0]}-desktop.png` });
  await ctx.close();
}

// Catalogue: force every lazy image to load, then count what is still broken.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?sort=name`, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(async () => {
    // Bounded: the catalogue grows as lazy content lands, so cap the number of steps.
    for (let i = 0; i < 30; i++) {
      window.scrollTo(0, i * 700);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(4000);
  results["desktop:catalogue"] = await probe(page);
  await page.screenshot({ path: `${OUT}/catalogue-desktop.png` });
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 1));
