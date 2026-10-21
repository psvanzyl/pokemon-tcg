import { chromium } from "@playwright/test";

// Probe the live Carddex sign-in page for the Google Identity Services button.
// Reports whether GIS loaded, what the button iframe src is, and every console line.
const B = process.env.BASE || "https://pokemon.laserraptorai.duckdns.org";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();

const console_msgs = [];
const failed = [];
page.on("console", (m) => console_msgs.push(`${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => console_msgs.push(`pageerror: ${String(e)}`));
page.on("requestfailed", (r) => failed.push(`${r.url()} :: ${r.failure()?.errorText}`));

await page.goto(B + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });

let gsi = false;
for (let i = 0; i < 20; i++) {
  gsi = await page.evaluate(() => !!(window.google && window.google.accounts && window.google.accounts.id));
  if (gsi) break;
  await page.waitForTimeout(1000);
}
await page.waitForTimeout(2500);

const info = await page.evaluate(() => {
  const iframes = [...document.querySelectorAll("iframe")].map((f) => f.src);
  const box = document.querySelector('[class*="min-h-[44px]"]');
  return {
    url: location.href,
    title: document.title,
    gsi: !!(window.google && window.google.accounts && window.google.accounts.id),
    iframes,
    boxHTML: box ? box.innerHTML.slice(0, 300) : null,
    boxText: box ? box.innerText.slice(0, 200) : null,
    visible: box ? getComputedStyle(box).display : null,
    bodyTail: document.body.innerText.slice(0, 600),
  };
});

console.log("INFO", JSON.stringify(info, null, 2));
console.log("CONSOLE", JSON.stringify(console_msgs, null, 2));
console.log("FAILED_REQUESTS", JSON.stringify(failed, null, 2));

await page.screenshot({ path: "/tmp/probe-google-login.png", fullPage: true });
await browser.close();
