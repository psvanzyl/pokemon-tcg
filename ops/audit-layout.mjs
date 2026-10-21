import { chromium } from "@playwright/test";

// Text-first layout audit (no vision model needed): overflow, clipping, broken
// images, empty controls, tiny text, zero-height blocks — on live Carddex pages.
const B = process.env.BASE || "https://pokemon.laserraptorai.duckdns.org";
const email = process.env.QA_EMAIL || "carddex-qa@laserraptorai.duckdns.org";
const password = process.env.QA_PASSWORD || "QaCarddex2026!";

const AUDIT = `(() => {
  const W = window.innerWidth;
  const out = { width: W, scrollW: document.documentElement.scrollWidth, overflow: [], clipped: [], brokenImg: [], emptyCtrl: [], tiny: [], zeroH: [], counts: {} };
  const desc = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0,3).join('.') : '');
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > W + 1.5) out.overflow.push(desc(el) + ' right=' + Math.round(r.right) + ' w=' + Math.round(r.width));
    if (r.left < -1.5) out.overflow.push(desc(el) + ' left=' + Math.round(r.left));
    const txt = (el.textContent || '').trim();
    if (txt && el.children.length === 0 && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) && cs.overflow !== 'visible') out.clipped.push(desc(el) + ' :: "' + txt.slice(0,60) + '"');
    if (el.tagName === 'IMG' && (!el.complete || el.naturalWidth === 0)) out.brokenImg.push((el.currentSrc||el.src||'(no src)').slice(0,90));
    const fs = parseFloat(cs.fontSize);
    if (txt && fs && fs < 10.5 && el.children.length === 0) out.tiny.push(desc(el) + ' ' + fs + 'px :: "' + txt.slice(0,40) + '"');
  }
  for (const b of document.querySelectorAll('button, a[href], input, select')) {
    const label = (b.getAttribute('aria-label') || b.textContent || b.value || '').trim();
    if (!label) out.emptyCtrl.push(desc(b));
  }
  for (const h of document.querySelectorAll('h1,h2,h3,main > div,main > section')) {
    const r = h.getBoundingClientRect();
    if (r.height < 2 && (h.textContent||'').trim()) out.zeroH.push(desc(h) + ' :: ' + h.textContent.trim().slice(0,40));
  }
  out.counts = { cards: document.querySelectorAll('img').length, links: document.querySelectorAll('a[href]').length, buttons: document.querySelectorAll('button').length, text: (document.body.innerText||'').length };
  return out;
})()`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
await page.goto(B + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1200);
await page.locator('form input[type="email"]').fill(email);
await page.locator('form input[type="password"]').fill(password);
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(4000);

for (const [name, url] of [["account-desktop", "/account"], ["catalogue", "/"], ["login-public", "/login"]]) {
  await page.goto(B + url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  const a = await page.evaluate(AUDIT);
  console.log(`\n=== ${name} (${url}) ${a.width}px scrollW=${a.scrollW} ===`);
  for (const k of ["overflow", "clipped", "brokenImg", "emptyCtrl", "tiny", "zeroH"]) {
    console.log(`  ${k}: ${a[k].length}` + (a[k].length ? "\n    - " + [...new Set(a[k])].slice(0, 12).join("\n    - ") : ""));
  }
  console.log("  counts:", JSON.stringify(a.counts));
}

const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() });
const mp = await mctx.newPage();
for (const [name, url] of [["account-mobile", "/account"], ["home-mobile", "/"]]) {
  await mp.goto(B + url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await mp.waitForTimeout(4000);
  const a = await mp.evaluate(AUDIT);
  console.log(`\n=== ${name} (${url}) ${a.width}px scrollW=${a.scrollW} ===`);
  for (const k of ["overflow", "clipped", "brokenImg", "emptyCtrl", "tiny", "zeroH"]) {
    console.log(`  ${k}: ${a[k].length}` + (a[k].length ? "\n    - " + [...new Set(a[k])].slice(0, 12).join("\n    - ") : ""));
  }
}
await browser.close();
