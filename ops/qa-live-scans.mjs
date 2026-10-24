import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Prove the LIVE site renders card scans: count broken images on the French-name search.
// Runs on CT141, which has egress to the TCGdex and TCGplayer CDNs.
const B = process.env.BASE || "https://pokemon.laserraptorai.duckdns.org";
const OUT = process.env.OUT || "/tmp/carddex-live-search";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();

await page.goto(B + "/?q=Caninos+de+Hisui", { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(9000);

const scan = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll("img")].filter((i) => i.alt);
  return {
    total: imgs.length,
    loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
    broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
    pending: imgs.filter((i) => !i.complete).length,
    srcs: imgs.map((i) => i.src),
  };
});

console.log("scans:", JSON.stringify({ total: scan.total, loaded: scan.loaded, broken: scan.broken, pending: scan.pending }));
for (const s of scan.srcs) console.log("  ", s);
console.log(scan.broken === 0 && scan.loaded > 0 ? "PASS scans render" : "FAIL scans missing");

await page.screenshot({ path: `${OUT}/live-fr-search.png` });
await browser.close();
