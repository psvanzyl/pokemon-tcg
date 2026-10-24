// QA the Carddex multilingual search across all four entry points.
//
// Run against a RUNNING instance (local build or the live site):
//   BASE=http://127.0.0.1:3010 node ops/qa-search.mjs
//
// Checks that a card is findable by the name it was PRINTED, in every
// spelling a collector actually types: the plain name, a typo, a different
// word order, a trailing qualifier, and another print language. Also drives
// the collection add box end to end (search -> Add -> the collection lists
// it), because the add box is the path behind the login and it is the one
// most likely to have been written for a different job.
//
// Reads QA_EMAIL / QA_PASSWORD from the environment (default: the throwaway
// account created for this probe). Creates no data beyond the collection
// entries it adds to that account.

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const B = process.env.BASE || "http://127.0.0.1:3010";
const OUT = process.env.OUT || "/tmp/carddex-search-qa";
mkdirSync(OUT, { recursive: true });

const email = process.env.QA_EMAIL || "carddex-search-test@example.com";
const password = process.env.QA_PASSWORD || "Test-Carddex-2026!";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();

const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${String(e)}`));
page.on("response", (r) => {
  if (r.status() >= 400) problems.push(`http ${r.status()} ${r.request().method()} ${r.url()}`);
});

const results = [];
const check = (n, ok, extra = "") => {
  results.push([n, ok, extra]);
  console.log(`${ok ? "PASS" : "FAIL"} ${n}${extra ? " — " + extra : ""}`);
};

/* --------------------------------------------------------------- sign in */
await page.goto(B + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1500);
await page.locator('form input[type="email"]').fill(email);
await page.locator('form input[type="password"]').fill(password);
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(4500);
check("signed in and landed on /account", /\/account/.test(page.url()), page.url());

/* ------------------------------- the add box, in the printed name (French) */
const input = page.getByPlaceholder(/Search by card name or number/);
check("add box is visible", await input.isVisible());

// Every spelling a collector types must find the card AND show the printed name.
const queries = [
  { q: "Caninos", expect: /Caninos|Growlithe/i },
  { q: "Caninos de Hisui", expect: /Caninos de Hisui/i },
  { q: "Caninos de Husui", expect: /Caninos de Hisui/i }, // typo
  { q: "Hisui Caninos", expect: /Caninos de Hisui/i }, // word order
  { q: "Caninos de Hisui V", expect: /Caninos de Hisui/i }, // qualifier
  { q: "Hisui-Fukano", expect: /Hisui-Fukano/i }, // another language
];

for (const { q, expect } of queries) {
  await input.fill(q);
  await page.waitForTimeout(2600);
  const rows = page.locator("ul li", { has: page.getByRole("button", { name: "Add", exact: true }) });
  const n = await rows.count();
  const text = n ? (await rows.first().innerText()).replace(/\n/g, " | ") : "";
  check(`add box finds cards for "${q}"`, n > 0, `${n} hits — ${text}`);
  check(`  first hit shows the printed name for "${q}"`, expect.test(text), text);
  if (n) {
    await rows.first().getByRole("button", { name: "Add", exact: true }).click();
    await page.waitForTimeout(2200);
    const flash = (await page.locator("body").innerText()).match(/Added [^\n]*/)?.[0] ?? "";
    check(`  add succeeded for "${q}"`, /Added/.test(flash), flash);
  }
}

/* ----------------------------------------- the collection now holds them */
await page.goto(B + "/account", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(3000);
const body = await page.locator("body").innerText();
check("collection lists the added card", /Growlithe/i.test(body));
await page.screenshot({ path: `${OUT}/account-after-add.png` });

/* ------------------------------------------- the catalogue fallback (public) */
await page.goto(B + "/?q=Caninos+de+Hisui", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(7000);
const cat = await page.locator("body").innerText();
check("catalogue shows the French-name match", /matched by the Français name/i.test(cat));
const tiles = await page.locator('a[href*="/kaart/"]').count();
check("catalogue lists matching cards", tiles > 0, `${tiles} tiles`);
await page.screenshot({ path: `${OUT}/catalogue-fr.png` });

/* --------------- the sort control must mean the same thing on both paths */
const prices = async () =>
  JSON.parse(
    await page.evaluate(() =>
      JSON.stringify(
        [...document.querySelectorAll('a[href*="/kaart/"]')].map((a) => {
          const m = a.innerText.match(/\$([\d,.]+)/);
          return m ? parseFloat(m[1].replace(",", "")) : null;
        }),
      ),
    ),
  );
const descending = (a) => a.every((v, i) => i === 0 || v <= a[i - 1]);
const ascending = (a) => a.every((v, i) => i === 0 || v >= a[i - 1]);

await page.goto(B + "/?q=Caninos+de+Hisui&sort=price-desc", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(7000);
const desc = await prices();
check("localised results honour price-desc", desc.length > 1 && descending(desc), JSON.stringify(desc));

await page.goto(B + "/?q=Caninos+de+Hisui&sort=price-asc", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(7000);
const asc = await prices();
check("localised results honour price-asc", asc.length > 1 && ascending(asc), JSON.stringify(asc));

/* ------------------------------------------------------------- mobile view */
const mob = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mpage = await mob.newPage();
await mpage.goto(B + "/?q=Caninos+de+Husui", { waitUntil: "domcontentloaded", timeout: 60000 });
await mpage.waitForTimeout(7000);
const overflow = await mpage.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
check("mobile catalogue has no horizontal overflow", overflow <= 2, `${overflow}px`);
await mpage.screenshot({ path: `${OUT}/catalogue-fr-mobile.png` });

check("no HTTP or page errors", problems.length === 0, problems.join(" | "));

await browser.close();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
