import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Post-fix verification: does Google Identity Services accept our origin now?
const B = process.env.BASE || "https://pokemon.laserraptorai.duckdns.org";
const OUT = process.env.OUT || "/tmp/carddex-gsi";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();

const gsi = [];
const logs = [];
page.on("response", (r) => {
  if (/accounts\.google\.com|gstatic\.com/.test(r.url())) gsi.push(`${r.status()} ${r.url().slice(0, 150)}`);
});
page.on("console", (m) => {
  const t = m.text();
  if (/GSI|google|origin/i.test(t)) logs.push(`${m.type()}: ${t.slice(0, 200)}`);
});
page.on("pageerror", (e) => logs.push(`pageerror: ${String(e).slice(0, 200)}`));

await page.goto(B + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });
// wait for the GIS script + button render
for (let i = 0; i < 20; i++) {
  const ready = await page.evaluate(() => !!(window.google && window.google.accounts && window.google.accounts.id));
  if (ready) break;
  await page.waitForTimeout(1000);
}
await page.waitForTimeout(6000);

const state = await page.evaluate(() => {
  const iframes = [...document.querySelectorAll('iframe')].map((f) => {
    const r = f.getBoundingClientRect();
    return { src: (f.src || "").slice(0, 120), w: Math.round(r.width), h: Math.round(r.height), visible: r.width > 0 && r.height > 0 };
  });
  const host = document.querySelector('div[id^="g_id_"], div.g_id_signin, [data-gsi]');
  return {
    gisApi: !!(window.google && window.google.accounts && window.google.accounts.id),
    iframes,
    buttonHost: host ? { tag: host.tagName, cls: host.className, w: Math.round(host.getBoundingClientRect().width), h: Math.round(host.getBoundingClientRect().height) } : null,
    bodyHasGoogle: /Continue with Google|Sign in with Google/i.test(document.body.innerText),
  };
});

console.log("GIS api loaded:", state.gisApi);
console.log("google-origin-related console lines:", JSON.stringify(logs, null, 1));
console.log("accounts.google.com / gstatic responses:");
for (const g of [...new Set(gsi)]) console.log("   " + g);
console.log("iframes:", JSON.stringify(state.iframes, null, 1));
console.log("button host:", JSON.stringify(state.buttonHost));
console.log("body mentions Google button:", state.bodyHasGoogle);
console.log("ANY 403 on gsi?", gsi.some((g) => g.startsWith("403")));

await page.screenshot({ path: `${OUT}/login-after-fix.png`, fullPage: true });
// crop just the sign-in card for a closer look
const card = await page.evaluate(() => {
  const el = document.querySelector("form")?.closest("div");
  const r = el?.getBoundingClientRect();
  return r ? { x: Math.max(0, Math.round(r.x) - 20), y: Math.max(0, Math.round(r.y) - 20), width: Math.round(r.width) + 40, height: Math.round(r.height) + 40 } : null;
});
if (card) await page.screenshot({ path: `${OUT}/login-card.png`, clip: card });
await browser.close();
