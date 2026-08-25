import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.CODEX15_BIOSPHERE_QA_URL || "http://127.0.0.1:3000";
const route = "/v4/memory-biosphere";
const outDir = "qa-artifacts/codex15-memory-biosphere";
mkdirSync(outDir, { recursive: true });

const results = [];
const record = (viewport, check, ok, detail = "") => {
  const row = { viewport, check, ok, detail };
  results.push(row);
  console.log(`${ok ? "PASS" : "FAIL"}  ${viewport}  ${check}${detail ? `  [${detail}]` : ""}`);
  assert.equal(ok, true, `${viewport}: ${check}${detail ? ` (${detail})` : ""}`);
};

async function runViewport(browser, name, width, height, { touch = false } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: touch,
    isMobile: touch,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const apiRequests = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", (request) => {
    try {
      const pathname = new URL(request.url()).pathname;
      if (pathname.startsWith("/api/")) apiRequests.push(request.url());
    } catch {}
  });

  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  record(name, "route returns success", Boolean(response?.ok()), String(response?.status() ?? "no-response"));

  const stage = page.getByTestId("memory-biosphere-stage");
  await stage.waitFor({ state: "visible" });
  record(name, "Memory Biosphere stage rendered", await stage.isVisible());
  record(name, "canonical first-Moment handoff preserved", await page.getByTestId("memory-biosphere-primary-handoff").getAttribute("href") === "/v4?start=1");
  record(name, "canonical HOME handoff preserved", await page.getByTestId("memory-biosphere-home-link").getAttribute("href") === "/v4");

  const imageState = await page.getByTestId("memory-biosphere-layer").evaluateAll((images) => images.map((image) => ({
    state: image.getAttribute("data-state"),
    loaded: image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
    src: image instanceof HTMLImageElement ? image.currentSrc : "",
  })));
  record(name, "all four native runtime derivatives loaded", imageState.length === 4 && imageState.every((image) => image.loaded), imageState.map((image) => image.state).join(","));
  record(name, "no Drive/source HTML runtime dependency", imageState.every((image) => !/drive\.google|\.html(?:$|[?#])/.test(image.src)));

  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  record(name, "horizontal overflow is zero", overflow <= 1, `overflow:${overflow}`);

  const storageBefore = await page.evaluate(() => Object.keys(localStorage).sort());

  if (!touch) {
    const box = await stage.boundingBox();
    assert.ok(box, `${name}: missing stage box`);
    await page.mouse.move(box.x + box.width * 0.05, box.y + box.height * 0.9);
    await page.waitForTimeout(60);
    record(name, "far pointer resolves Human", await stage.getAttribute("data-active-state") === "human", String(await stage.getAttribute("data-active-state")));
    await page.mouse.move(box.x + box.width * 0.625, box.y + box.height * 0.39);
    await page.waitForTimeout(80);
    record(name, "head-centered pointer resolves Memory Sphere", await stage.getAttribute("data-active-state") === "sphere", String(await stage.getAttribute("data-active-state")));
  } else {
    const bloom = page.getByTestId("memory-biosphere-state-button").filter({ has: page.locator("text=Bloom") });
    await bloom.tap();
    record(name, "touch tap selects Bloom without hover", await stage.getAttribute("data-active-state") === "bloom", String(await stage.getAttribute("data-active-state")));
    const sphere = page.locator('[data-testid="memory-biosphere-state-button"][data-state="sphere"]');
    await sphere.tap();
    record(name, "touch tap selects Sphere without hover", await stage.getAttribute("data-active-state") === "sphere", String(await stage.getAttribute("data-active-state")));
  }

  const firstButton = page.locator('[data-testid="memory-biosphere-state-button"][data-state="human"]');
  await firstButton.focus();
  await firstButton.press("ArrowRight");
  record(name, "keyboard ArrowRight selects Trace", await stage.getAttribute("data-active-state") === "trace", String(await stage.getAttribute("data-active-state")));
  const focusedState = await page.evaluate(() => document.activeElement?.getAttribute("data-state"));
  record(name, "keyboard selection moves focus", focusedState === "trace", String(focusedState));
  await page.keyboard.press("End");
  record(name, "keyboard End selects Sphere", await stage.getAttribute("data-active-state") === "sphere", String(await stage.getAttribute("data-active-state")));

  const storageAfter = await page.evaluate(() => Object.keys(localStorage).sort());
  record(name, "donor interaction adds no local persistence", JSON.stringify(storageBefore) === JSON.stringify(storageAfter), `${storageBefore.length}->${storageAfter.length}`);
  record(name, "donor route makes no product API request", apiRequests.length === 0, apiRequests.join(","));
  record(name, "page errors zero", pageErrors.length === 0, pageErrors.join(" | "));
  record(name, "console errors zero", consoleErrors.length === 0, consoleErrors.join(" | "));

  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  await context.close();
}

async function runReducedMotion(browser) {
  const name = "reduced-motion-390x844";
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  const stage = page.getByTestId("memory-biosphere-stage");
  const orbitDuration = await page.locator(".mb-orbit-outer").evaluate((node) => getComputedStyle(node).animationDuration);
  const layerDuration = await page.locator(".mb-portrait-layer").first().evaluate((node) => getComputedStyle(node).transitionDuration);
  record(name, "ambient orbit motion is collapsed", orbitDuration !== "18s", orbitDuration);
  record(name, "state transition motion is collapsed", !/^0\.18s/.test(layerDuration), layerDuration);
  await page.locator('[data-testid="memory-biosphere-state-button"][data-state="sphere"]').tap();
  record(name, "semantic touch selection survives reduced motion", await stage.getAttribute("data-active-state") === "sphere");
  record(name, "page errors zero", errors.length === 0, errors.join(" | "));
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await runViewport(browser, "desktop-1280x800", 1280, 800);
  await runViewport(browser, "phone-390x844", 390, 844, { touch: true });
  await runViewport(browser, "mobile-320x720", 320, 720, { touch: true });
  await runReducedMotion(browser);
} finally {
  await browser.close();
  writeFileSync(`${outDir}/qa-results.json`, `${JSON.stringify(results, null, 2)}\n`);
}
