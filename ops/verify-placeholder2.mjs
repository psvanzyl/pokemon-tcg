// Second pass: the Gengar SWSH241 promo (real card id = product id) + which cards fall back.
import { chromium } from "playwright";

const BASE = "https://pokemon.laserraptorai.duckdns.org";
const OUT = "/tmp/verify-placeholder";
const fs = await import("node:fs");
fs.mkdirSync(OUT, { recursive: true });

const probe = async (page) => page.evaluate(() => {
  const imgs = [...document.images];
  const ph = [...document.querySelectorAll('span[role="img"][aria-label*="no scan available"]')];
  return {
    status: "ok",
    placeholders: ph.length,
    placeholderNames: ph.map((s) => s.getAttribute("aria-label")),
    broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
    loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
    totalImgs: imgs.length,
  };
});

const browser = await chromium.launch();
const results = {};

for (const [label, vp] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const resp = await page.goto(`${BASE}/kaart/607368`, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2500);
  results[`${label}:/kaart/607368`] = { httpStatus: resp?.status(), ...(await probe(page)) };
  await page.screenshot({ path: `${OUT}/kaart-607368-${label}.png` });
  await ctx.close();
}

// Catalogue: which cards are showing the fallback, and is anything still broken?
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?sort=name`, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(async () => {
    for (let i = 0; i < 30; i++) {
      window.scrollTo(0, i * 700);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(4000);
  results["desktop:catalogue"] = await probe(page);
  // Grab a crop-worthy shot of the tile row containing a placeholder.
  await page.evaluate(() => {
    const ph = document.querySelector('span[role="img"][aria-label*="no scan available"]');
    if (ph) ph.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/catalogue-placeholder-row.png` });
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 1));
