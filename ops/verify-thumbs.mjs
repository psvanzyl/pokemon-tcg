// Exercises the collection-thumb branch of CardImage (decorative alt="" → aria-hidden placeholder).
// Registers a throwaway account on the live site, adds one dead-scan card and one control card,
// then counts what /account actually renders. Run from the app dir on CT141.
import { chromium } from "playwright";
import { randomBytes } from "node:crypto";

const BASE = "https://pokemon.laserraptorai.duckdns.org";
const OUT = "/tmp/verify-thumbs";
const fs = await import("node:fs");
fs.mkdirSync(OUT, { recursive: true });

const email = `carddex-thumb-${Date.now()}@laserraptorai.duckdns.org`;
const password = randomBytes(12).toString("base64url"); // never printed

const DEAD = { cardId: 607368, variant: "Holofoil" };  // Gengar SWSH241 — no scan on the CDN
const OK = { cardId: 84198, variant: "Holofoil" };     // control: scan present

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const out = { email };

const post = (url, body) =>
  page.evaluate(async ([u, b]) => {
    const r = await fetch(u, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b),
    });
    return { status: r.status, body: (await r.text()).slice(0, 200) };
  }, [url, body]);

await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 60000 });
out.register = await post("/api/auth/register", { email, password });
for (const c of [DEAD, OK]) {
  out[`add_${c.cardId}`] = await post("/api/collection", { ...c, mode: "add", qty: 1 });
}

await page.goto(`${BASE}/account`, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(3000);

const probe = () =>
  page.evaluate(() => {
    const imgs = [...document.images];
    return {
      decorativePlaceholders: document.querySelectorAll('span[aria-hidden="true"].object-cover > svg').length,
      labelledPlaceholders: document.querySelectorAll('span[role="img"][aria-label*="no scan available"]').length,
      deadScanImgStillInDom: imgs.filter((i) => (i.src || "").includes("607368")).length,
      broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
      loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
      totalImgs: imgs.length,
      // Any collection row at all?
      bodyText: document.body.innerText.slice(0, 400),
    };
  });

out.desktop = await probe();
await page.screenshot({ path: `${OUT}/account-desktop.png` });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1500);
out.mobile = await probe();
await page.screenshot({ path: `${OUT}/account-mobile.png`, fullPage: false });

await browser.close();
console.log(JSON.stringify(out, null, 1));
