import { chromium } from "@playwright/test";

// Layout + image audit v3 (bounded scroll — the catalogue grows as it lazy-loads,
// so the scroll loop must be step-capped, not scrollHeight-bounded).
const B = process.env.BASE || "https://pokemon.laserraptorai.duckdns.org";
const email = process.env.QA_EMAIL || "carddex-qa@laserraptorai.duckdns.org";
const password = process.env.QA_PASSWORD || "QaCarddex2026!";

async function settle(page) {
  for (let i = 0; i < 22; i++) {
    await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.9)));
    await page.waitForTimeout(180);
  }
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

const AUDIT = `(() => {
  const W = window.innerWidth;
  const imgs = [...document.querySelectorAll('img')];
  return {
    width: W,
    scrollW: document.documentElement.scrollWidth,
    imgs: imgs.length,
    broken: imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => (i.currentSrc||i.src||'(none)').slice(0,110)),
    overflow: [...document.querySelectorAll('body *')].filter(el => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return false;
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return false;
      return r.right > W + 1.5 || r.left < -1.5;
    }).map(el => el.tagName.toLowerCase() + '.' + String(el.className).trim().split(/\\s+/).slice(0,2).join('.')).slice(0, 8),
  };
})()`;

const browser = await chromium.launch();
const problems = [];

async function run(page, label, url) {
  await page.goto(B + url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  await settle(page);
  const a = await page.evaluate(AUDIT);
  console.log(`=== ${label} ${url} (${a.width}px, scrollW=${a.scrollW}) images=${a.imgs} broken=${a.broken.length} overflowEls=${a.overflow.length}`);
  for (const b of a.broken.slice(0, 5)) console.log("    BROKEN " + b);
  if (a.overflow.length) console.log("    OVERFLOW " + a.overflow.join(", "));
  return a;
}

const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
page.on("response", (r) => { if (r.status() >= 400 && !/gsi\//.test(r.url())) problems.push(`${r.status()} ${r.url().slice(0, 110)}`); });

await page.goto(B + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1000);
await page.locator('form input[type="email"]').fill(email);
await page.locator('form input[type="password"]').fill(password);
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(4000);

for (const [l, u] of [["catalogue", "/"], ["account", "/account"], ["card", "/kaart/84198"]]) await run(page, l, u);

const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() });
const mp = await mctx.newPage();
mp.on("response", (r) => { if (r.status() >= 400 && !/gsi\//.test(r.url())) problems.push(`m ${r.status()} ${r.url().slice(0, 110)}`); });
for (const [l, u] of [["mobile-home", "/"], ["mobile-account", "/account"], ["mobile-card", "/kaart/84198"]]) await run(mp, l, u);

console.log("HTTP>=400 (excl gsi):", JSON.stringify([...new Set(problems)]));
await browser.close();
