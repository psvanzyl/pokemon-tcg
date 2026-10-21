import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

// End-to-end QA of the Carddex account + collection feature on the LIVE site:
// register/sign in -> add cards from the catalogue search -> collection worth ->
// sign out -> sign in -> value persists.
const B = process.env.BASE || "https://pokemon.laserraptorai.duckdns.org";
const OUT = process.env.OUT || "/tmp/carddex-accounts";
mkdirSync(OUT, { recursive: true });

const email = process.env.QA_EMAIL || "carddex-qa@laserraptorai.duckdns.org";
const password = process.env.QA_PASSWORD || "QaCarddex2026!";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();

const problems = [];
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`console: ${m.text()}`);
});
page.on("pageerror", (e) => problems.push(`pageerror: ${String(e)}`));
page.on("requestfailed", (r) => problems.push(`reqfail: ${r.url()} :: ${r.failure()?.errorText}`));
page.on("response", (r) => {
  if (r.status() >= 400) problems.push(`http ${r.status()} ${r.request().method()} ${r.url()}`);
});

const step = (n, ok, extra = "") => console.log(`${ok ? "PASS" : "FAIL"} ${n}${extra ? " — " + extra : ""}`);

async function signIn() {
  await page.goto(B + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.locator('form input[type="email"]').fill(email);
  await page.locator('form input[type="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForTimeout(4500);
}

/* ---------------------------------------------------------------- register */
await page.goto(B + "/login?mode=register", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2000);
console.log("register page h1:", await page.locator("h1").first().innerText());
await page.locator('form input[type="email"]').fill(email);
await page.locator('form input[type="password"]').fill(password);
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(4000);
if (/\/login/.test(page.url())) {
  console.log("register did not redirect (account likely exists) -> signing in");
  console.log("login body:", (await page.locator("body").innerText()).slice(0, 300));
  await signIn();
}
step("signed in and landed on /account", /\/account/.test(page.url()), page.url());
const me = await page.evaluate(async () => (await fetch("/api/auth/me", { cache: "no-store" })).json());
console.log("api/auth/me:", JSON.stringify(me));

/* ------------------------------------------ add cards from catalogue search */
const wanted = ["Charizard", "Blastoise", "Mewtwo"];
for (const term of wanted) {
  const input = page.getByPlaceholder(/Search by card name or number/);
  await input.fill(term);
  await page.waitForTimeout(2500);
  const rows = page.locator("ul li", { has: page.getByRole("button", { name: "Add", exact: true }) });
  const n = await rows.count();
  console.log(`search "${term}": ${n} hits`);
  if (!n) continue;
  const first = rows.first();
  console.log("  first hit:", (await first.innerText()).replace(/\n/g, " | "));
  await first.getByRole("button", { name: "Add", exact: true }).click();
  await page.waitForTimeout(2500);
  console.log("  after add:", (await page.locator("body").innerText()).match(/Added [^\n]*/)?.[0] ?? "(no flash)");
  await input.fill("");
}

const acct = await page.evaluate(async () => (await fetch("/api/collection", { cache: "no-store" })).json());
console.log("api/collection totals:", JSON.stringify(acct.totals));
console.log("lines:", (acct.lines || []).map((l) => `${l.name} [${l.variant}] x${l.qty} = ${l.value}`).join(" | "));
step("collection has rows", (acct.lines || []).length > 0, `${(acct.lines || []).length} rows`);
step("collection value > 0", (acct.totals?.value ?? 0) > 0, String(acct.totals?.value));

await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/account-desktop.png`, fullPage: true });
console.log("ACCOUNT PAGE TEXT >>>\n" + (await page.locator("body").innerText()).slice(0, 1200));

/* ------------------------------------------------------------ sign out / in */
await page.getByRole("main").getByRole("button", { name: "Sign out" }).click();
await page.waitForTimeout(3500);
console.log("after signout url:", page.url());
step("signed out to the public site", !/\/account/.test(page.url()), page.url());
await signIn();
step("re-signed in", /\/account/.test(page.url()), page.url());
const again = await page.evaluate(async () => (await fetch("/api/collection", { cache: "no-store" })).json());
step(
  "value survives sign-out/sign-in",
  (again.totals?.value ?? 0) === (acct.totals?.value ?? -1),
  `${again.totals?.value}`,
);

/* --------------------------------------------------------- card page button */
await page.goto(B + "/kaart/84198", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(4000);
const cardText = await page.locator("body").innerText();
console.log("card page /kaart/84198 body >>>\n" + cardText.slice(0, 500));
await page.screenshot({ path: `${OUT}/card-page.png`, fullPage: false });

/* ------------------------------------------------------------------ mobile */
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() });
const mp = await mctx.newPage();
await mp.goto(B + "/account", { waitUntil: "domcontentloaded", timeout: 60000 });
await mp.waitForTimeout(5000);
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
step("mobile /account has no horizontal overflow", overflow <= 1, `${overflow}px`);
await mp.screenshot({ path: `${OUT}/account-mobile.png`, fullPage: true });

const lctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const lp = await lctx.newPage();
await lp.goto(B + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });
await lp.waitForTimeout(6000);
await lp.screenshot({ path: `${OUT}/login-desktop.png`, fullPage: true });

console.log("PROBLEMS", JSON.stringify(problems, null, 2));
await browser.close();
