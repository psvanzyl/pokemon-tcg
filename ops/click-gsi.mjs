import { chromium } from "@playwright/test";

// Does clicking "Continue with Google" actually start a Google flow now?
const B = process.env.BASE || "https://pokemon.laserraptorai.duckdns.org";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
await page.goto(B + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(8000);

const box = await page.evaluate(() => {
  const f = [...document.querySelectorAll("iframe")].find((i) => /accounts\.google\.com\/gsi\/button/.test(i.src));
  if (!f) return null;
  const r = f.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
console.log("button centre:", JSON.stringify(box));

let popupUrl = null;
page.on("popup", async (p) => {
  popupUrl = p.url();
  console.log("POPUP opened:", popupUrl.slice(0, 160));
});

if (box) {
  await page.mouse.click(box.x, box.y);
  await page.waitForTimeout(9000);
}
const after = await page.evaluate(() => ({
  url: location.href,
  dialogs: [...document.querySelectorAll("iframe")].map((i) => (i.src || "").slice(0, 90)),
}));
console.log("popup seen:", popupUrl ? popupUrl.slice(0, 200) : "NONE (FedCM/account-chooser may be native in headless)");
console.log("page after click:", JSON.stringify(after));
await browser.close();
