import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

// QA the multilingual collection add box: a collector must be able to find a card
// by the name it was PRINTED ("Caninos de Hisui", "Hisui-Fukano") and add it.
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

const queries = [
  { q: "Caninos", expect: /Caninos|Growlithe/i },
  { q: "Caninos de Hisui", expect: /Caninos de Hisui/i },
  { q: "Caninos de Husui", expect: /Caninos de Hisui/i },
  { q: "Hisui-Fukano", expect: /Hisui-Fukano/i },
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
check("collection lists Hisuian Growlithe", /Hisuian Growlithe/i.test(body));
await page.screenshot({ path: `${OUT}/account-after-add.png`, fullPage: false });

/* ------------------------------------------- the catalogue fallback (public) */
await page.goto(B + "/?q=Caninos+de+Hisui", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(7000);
const cat = await page.locator("body").innerText();
check("catalogue shows the French-name match", /matched by the Français name/i.test(cat));
const tiles = await page.locator('a[href*="/kaart/"]').count();
check("catalogue lists matching cards", tiles > 0, `${tiles} tiles`);
await page.screenshot({ path: `${OUT}/catalogue-fr.png` });

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
