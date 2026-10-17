import { chromium } from "@playwright/test";
const B = "https://pokemon.laserraptorai.duckdns.org";
const pages = [["/", "home"], ["/sets", "sets"], ["/about", "about"], ["/kaart/84198", "detail"]];
const b = await chromium.launch();
for (const [vp, tag] of [[{ width: 1440, height: 950 }, "desktop"], [{ width: 390, height: 844 }, "mobile"]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  for (const [path, name] of pages) {
    await p.goto(B + path, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(name === "home" ? 9000 : 5000);
    if (name === "home") await p.mouse.wheel(0, 1200), await p.waitForTimeout(4000);
    await p.screenshot({ path: `/tmp/shot-${name}-${tag}.png` });
    console.log(name, tag, "ok");
  }
  await ctx.close();
}
await b.close();
