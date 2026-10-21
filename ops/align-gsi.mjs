import { chromium } from "@playwright/test";

// Geometry check: is the Google button aligned/sized with the email+password form,
// and does it stay inside the card at mobile width?
const B = process.env.BASE || "https://pokemon.laserraptorai.duckdns.org";
const browser = await chromium.launch();

for (const vp of [{ w: 1440, h: 950, n: "desktop" }, { w: 390, h: 844, n: "mobile" }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  await page.goto(B + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(7000);
  const m = await page.evaluate(() => {
    const g = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const gsi = [...document.querySelectorAll("iframe")].find((i) => /gsi\/button/.test(i.src));
    const gr = gsi?.getBoundingClientRect();
    const card = document.querySelector("form")?.closest("div,section");
    const cr = card?.getBoundingClientRect();
    return {
      email: g('input[type="email"], input[name="email"]'),
      pass: g('input[type="password"]'),
      submit: g('form button[type="submit"], form button:not([type])'),
      gsi: gr ? { x: Math.round(gr.x), right: Math.round(gr.right), w: Math.round(gr.width), h: Math.round(gr.height) } : null,
      card: cr ? { x: Math.round(cr.x), right: Math.round(cr.right), w: Math.round(cr.width) } : null,
      docOverflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  console.log(`--- ${vp.n} ${vp.w}px ---`);
  console.log(JSON.stringify(m, null, 1));
  if (m.gsi && m.email) {
    console.log(`gsi vs email: same left edge? ${Math.abs(m.gsi.x - m.email.x) <= 2}  same right edge? ${Math.abs(m.gsi.right - m.email.right) <= 2}  width delta ${m.gsi.w - m.email.w}px`);
    console.log(`gsi inside card? ${m.card ? m.gsi.x >= m.card.x - 2 && m.gsi.right <= m.card.right + 2 : "n/a"}  page h-overflow ${m.docOverflow}px`);
  }
  await ctx.close();
}
await browser.close();
