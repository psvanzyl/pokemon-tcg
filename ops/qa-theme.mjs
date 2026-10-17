import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const B = "http://127.0.0.1:3001";
const OUT = "/tmp/carddex-shots";
mkdirSync(OUT, { recursive: true });

const PAGES = [
  ["/", "home"],
  ["/sets", "sets"],
  ["/about", "about"],
  ["/kaart/84198", "detail"],
];

const browser = await chromium.launch();

// ---- 1. visual sweep: light + dark, desktop + mobile ----------------------
for (const theme of ["light", "dark"]) {
  for (const [vp, tag] of [
    [{ width: 1440, height: 950 }, "desktop"],
    [{ width: 390, height: 844 }, "mobile"],
  ]) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: theme });
    await ctx.addInitScript((t) => {
      try {
        localStorage.setItem("carddex-theme", t);
      } catch {}
    }, theme);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    for (const [path, name] of PAGES) {
      await page.goto(B + path, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(name === "home" ? 6000 : 2000);
      if (name === "home") {
        await page.mouse.wheel(0, 900);
        await page.waitForTimeout(2500);
      }
      const dark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
      await page.screenshot({ path: `${OUT}/${name}-${tag}-${theme}.png` });
      console.log(`shot ${name}-${tag}-${theme} html.dark=${dark} errors=${errors.length}`);
    }
    await ctx.close();
  }
}

// ---- 2. header/logo close-up (both themes) --------------------------------
for (const theme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: theme });
  await ctx.addInitScript((t) => localStorage.setItem("carddex-theme", t), theme);
  const page = await ctx.newPage();
  await page.goto(B + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/header-${theme}.png`, clip: { x: 0, y: 0, width: 900, height: 56 } });
  await page.locator("header svg").first().screenshot({ path: `${OUT}/logo-${theme}.png` });
  await ctx.close();
}

// ---- 3. behaviour: default light, switch, persist, follow system -----------
const results = [];
const check = (name, ok, extra = "") => {
  results.push([name, ok, extra]);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
};

{
  const ctx = await browser.newContext({ colorScheme: "light" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(B + "/", { waitUntil: "domcontentloaded" });

  check("default theme is light", !(await page.evaluate(() => document.documentElement.classList.contains("dark"))));
  check("toggle is rendered", await page.locator('[data-testid="theme-toggle"]').isVisible());
  check("light is the pressed option", (await page.locator('[data-testid="theme-light"]').getAttribute("aria-pressed")) === "true");

  await page.locator('[data-testid="theme-dark"]').click();
  await page.waitForTimeout(400);
  check("dark click applies .dark", await page.evaluate(() => document.documentElement.classList.contains("dark")));
  check("dark persisted", (await page.evaluate(() => localStorage.getItem("carddex-theme"))) === "dark");
  check(
    "body background follows the token",
    (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === "rgb(7, 10, 16)",
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  check("dark survives a reload", await page.evaluate(() => document.documentElement.classList.contains("dark")));

  await page.locator('[data-testid="theme-light"]').click();
  await page.waitForTimeout(300);
  check("light click clears .dark", !(await page.evaluate(() => document.documentElement.classList.contains("dark"))));
  check(
    "light body background is white",
    (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === "rgb(255, 255, 255)",
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
  );

  // system mode follows the OS preference
  await page.emulateMedia({ colorScheme: "dark" });
  await page.locator('[data-testid="theme-system"]').click();
  await page.waitForTimeout(400);
  check("system + dark OS -> dark", await page.evaluate(() => document.documentElement.classList.contains("dark")));
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForTimeout(400);
  check("system follows OS back to light", !(await page.evaluate(() => document.documentElement.classList.contains("dark"))));

  await page.locator('[data-testid="theme-system"]').click();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  check("system survives reload", await page.evaluate(() => document.documentElement.classList.contains("dark")));

  check("no uncaught JS errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// ---- 4. no horizontal overflow, both themes, desktop + mobile -------------
for (const theme of ["light", "dark"]) {
  for (const [vp, tag] of [
    [{ width: 1440, height: 950 }, "desktop"],
    [{ width: 390, height: 844 }, "mobile"],
  ]) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: theme });
    await ctx.addInitScript((t) => localStorage.setItem("carddex-theme", t), theme);
    const page = await ctx.newPage();
    for (const [path] of PAGES) {
      await page.goto(B + path, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      check(`no overflow ${path} ${tag} ${theme}`, overflow <= 2, `${overflow}px`);
    }
    await ctx.close();
  }
}

await browser.close();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("FAILURES:");
  for (const [n, , e] of failed) console.log(` - ${n} ${e}`);
  process.exit(1);
}
