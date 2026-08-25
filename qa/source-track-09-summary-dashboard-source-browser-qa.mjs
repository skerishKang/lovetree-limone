import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.TRACK09_SOURCE_QA_URL || "http://127.0.0.1:4173";
const SOURCE_PATH = "/reference/source-tracks-snapshot/09_전체기억_요약대시보드/01_전체기억_요약대시보드.html";
const OUT = path.resolve(process.cwd(), "qa-artifacts/source-track09-summary-dashboard");
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop-1280x800", width: 1280, height: 800, touch: false },
  { name: "phone-390x844", width: 390, height: 844, touch: true },
  { name: "mobile-320x720", width: 320, height: 720, touch: true },
];

const views = ["stand", "changed", "future", "next"];

async function blockExternalDemoMedia(context) {
  await context.route(/^https:\/\//, async (route) => {
    const url = route.request().url();
    if (url.startsWith("https://fonts.googleapis.com/") ||
        url.startsWith("https://fonts.gstatic.com/") ||
        url.startsWith("https://i.ytimg.com/") ||
        url.startsWith("https://www.youtube") ||
        url.startsWith("https://youtube")) {
      await route.abort();
      return;
    }
    await route.continue();
  });
}

async function waitForSourceView(page, view) {
  await page.waitForFunction((expectedView) => {
    const screen = document.querySelector(`.card-screen[data-screen="${expectedView}"]`);
    return screen?.classList.contains("active") === true;
  }, view, { timeout: 2500 });

  await page.waitForFunction(() => {
    const pill = document.getElementById("progressPill");
    return pill?.classList.contains("show") !== true;
  }, undefined, { timeout: 2500 });
}

async function main() {
  const browser = await chromium.launch();
  const checks = [];
  const record = (viewport, check, pass, detail = "") => checks.push({ viewport, check, pass, detail });

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.touch,
      isMobile: viewport.touch,
    });
    await blockExternalDemoMedia(context);
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(`${BASE}${encodeURI(SOURCE_PATH)}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.locator(".workspace").waitFor({ state: "visible", timeout: 10000 });

    const questions = page.locator(".question");
    record(viewport.name, "four question summary controls", await questions.count() === 4, `count:${await questions.count()}`);

    for (let index = 0; index < views.length; index += 1) {
      const question = questions.nth(index);
      await question.click();
      await waitForSourceView(page, views[index]);
      const expanded = await question.getAttribute("aria-expanded");
      const activeScreen = page.locator(`.card-screen[data-screen="${views[index]}"]`);
      record(viewport.name, `question ${views[index]} expands`, expanded === "true", String(expanded));
      record(viewport.name, `result ${views[index]} activates`, (await activeScreen.getAttribute("class"))?.includes("active") === true);
    }

    await questions.first().focus();
    record(viewport.name, "question keyboard focusable", await questions.first().evaluate((element) => document.activeElement === element));

    const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    record(viewport.name, "horizontal overflow zero", overflow <= 1, `overflow:${overflow}`);

    const copy = await page.locator("body").innerText();
    record(viewport.name, "source fixture evidence remains visible only in source proof", copy.includes("93") && copy.includes("시즌"));
    record(viewport.name, "page errors zero", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));

    await page.screenshot({ path: path.join(OUT, `${viewport.name}.png`), fullPage: true });
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    await blockExternalDemoMedia(context);
    const page = await context.newPage();
    await page.goto(`${BASE}${encodeURI(SOURCE_PATH)}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.locator(".question").first().waitFor({ state: "visible", timeout: 10000 });
    const duration = await page.locator(".question").first().evaluate((element) => getComputedStyle(element).transitionDuration);
    const seconds = duration.split(",").map((value) => value.trim()).map((value) => value.endsWith("ms") ? Number.parseFloat(value) / 1000 : Number.parseFloat(value));
    record("reduced-motion", "source transition duration collapses", seconds.every((value) => Number.isFinite(value) && value <= 0.001), duration);
    await page.screenshot({ path: path.join(OUT, "desktop-1280x800-reduced-motion.png"), fullPage: true });
    await context.close();
  }

  await browser.close();
  const failures = checks.filter((check) => !check.pass);
  fs.writeFileSync(path.join(OUT, "qa-results.json"), JSON.stringify({ summary: { checks: checks.length, failures: failures.length }, results: checks }, null, 2));
  for (const check of checks) console.log(`${check.pass ? "PASS" : "FAIL"}  ${check.viewport}  ${check.check}${check.detail ? `  [${check.detail}]` : ""}`);
  if (failures.length) {
    console.error(`Track09 source browser QA had ${failures.length} failure(s)`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
