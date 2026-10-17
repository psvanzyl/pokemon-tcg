import { chromium } from "@playwright/test";

const B = "http://127.0.0.1:3001";
const OUT = "/tmp/carddex-shots";
const browser = await chromium.launch();
const results = [];
const check = (n, ok, extra = "") => {
  results.push([n, ok, extra]);
  console.log(`${ok ? "PASS" : "FAIL"} ${n}${extra ? " — " + extra : ""}`);
};

for (const theme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: theme });
  await ctx.addInitScript((t) => localStorage.setItem("carddex-theme", t), theme);
  const page = await ctx.newPage();
  await page.goto(B + "/sets", { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);

  // the Released cells must stay on one line — count line boxes per cell
  const wrapped = await page.$$eval("tbody tr td:nth-child(3)", (tds) =>
    tds.slice(0, 25).filter((td) => {
      const r = document.createRange();
      r.selectNodeContents(td);
      return r.getClientRects().length > 1;
    }).length,
  );
  check(`sets ${theme}: no wrapped date cell (25 rows)`, wrapped === 0, `wrapped=${wrapped}`);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(`sets ${theme}: no document overflow`, overflow <= 2, `${overflow}px`);
  await page.screenshot({ path: `${OUT}/sets-mobile-${theme}-fixed.png` });
  await ctx.close();
}

// card detail on mobile: price table + chart
for (const theme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: theme });
  await ctx.addInitScript((t) => localStorage.setItem("carddex-theme", t), theme);
  const page = await ctx.newPage();
  await page.goto(B + "/kaart/84198", { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/detail-mobile-${theme}.png` });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(`detail ${theme}: no document overflow`, overflow <= 2, `${overflow}px`);
  await ctx.close();
}

await browser.close();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
