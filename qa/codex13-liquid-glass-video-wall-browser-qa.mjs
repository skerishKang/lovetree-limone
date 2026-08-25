import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.V4_BASE_URL ?? "http://127.0.0.1:3000";
const screenshotDir = process.env.CODEX13_SCREENSHOT_DIR ?? "/tmp/codex13-browser-qa";
const route = "/v4/trees/codex13-qa/archive/video-wall";
const pixel = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Cdefs%3E%3ClinearGradient id='g' x2='1' y2='1'%3E%3Cstop stop-color='%23364253'/%3E%3Cstop offset='1' stop-color='%230e131b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='640' height='360' fill='url(%23g)'/%3E%3C/svg%3E";

const tree = { id: "codex13-qa", title: "Codex13 QA Tree", ownerId: "qa-owner", visibility: "public" };
const memories = Array.from({ length: 9 }, (_, index) => ({
  id: `qa-${index + 1}`,
  treeId: tree.id,
  title: `기억 ${index + 1}`,
  memo: `공간형 아카이브 QA ${index + 1}`,
  sourceType: index === 0 ? "image" : "youtube",
  sourceUrl: index === 0 ? pixel : `https://youtu.be/dQw4w9WgXcQ`,
  thumbnail: pixel,
  emotionTags: [index % 2 === 0 ? "설렘" : "기억"],
  discoveryDate: `2026-05-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
  timestamp: `2026-05-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
  sortOrder: index,
}));

async function installApiMocks(page) {
  await page.route("**/api/trees/codex13-qa", async (routeHandle) => {
    await routeHandle.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tree) });
  });
  await page.route("**/api/trees/codex13-qa/memories", async (routeHandle) => {
    await routeHandle.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(memories) });
  });
}

async function assertNoOverflow(page, name) {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(dimensions.scrollWidth <= dimensions.innerWidth, `${name}: horizontal overflow ${dimensions.scrollWidth} > ${dimensions.innerWidth}`);
}

async function auditViewport(browser, { name, width, height, mobile = false, reducedMotion = "no-preference" }) {
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: mobile,
    isMobile: mobile,
    reducedMotion,
  });
  const page = await context.newPage();
  await installApiMocks(page);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  assert.ok(response?.ok(), `${name}: route must return 2xx`);
  await page.getByRole("heading", { name: "Codex13 QA Tree" }).waitFor();
  const main = page.locator("main[data-codex13-native='archive-video-wall']");
  await main.waitFor();
  await assertNoOverflow(page, name);

  const cellCount = await page.locator("[data-wall-slot]").count();
  assert.equal(cellCount, mobile ? 25 : 35, `${name}: wall DOM window must remain bounded`);
  const activeLimit = Number(await main.getAttribute("data-active-video-limit"));
  assert.equal(activeLimit, mobile ? 2 : 6, `${name}: decoder budget must match viewport class`);
  const liveCount = await page.locator("[data-live-video='true'] video").count();
  assert.ok(liveCount <= activeLimit, `${name}: live video nodes ${liveCount} exceed ${activeLimit}`);

  if (!mobile) {
    await main.focus();
    const nearest = page.locator("[data-wall-slot][tabindex='0']").first();
    const beforeSlot = await nearest.getAttribute("data-wall-slot");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(40);
    const afterSlot = await page.locator("[data-wall-slot][tabindex='0']").first().getAttribute("data-wall-slot");
    assert.notEqual(afterSlot, beforeSlot, `${name}: ArrowRight must move a different wall cell into the nearest position`);
    await page.keyboard.press("Home");
  }

  const nearestButton = page.locator("[data-wall-slot][tabindex='0']").first();
  await nearestButton.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  assert.ok(await dialog.isVisible(), `${name}: selected Moment inspector must open`);
  assert.equal(await page.locator("[data-live-video='true'] video").count(), 0, `${name}: wall decoding must suspend behind inspector`);
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await page.waitForTimeout(50);
  assert.equal(await nearestButton.evaluate((node) => document.activeElement === node), true, `${name}: inspector must restore trigger focus`);

  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: true });
  assert.deepEqual(pageErrors, [], `${name}: page errors: ${pageErrors.join(" | ")}`);
  await context.close();
}

await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  await auditViewport(browser, { name: "desktop-1280x800", width: 1280, height: 800, reducedMotion: "reduce" });
  await auditViewport(browser, { name: "mobile-390x844", width: 390, height: 844, mobile: true });
  await auditViewport(browser, { name: "mobile-320x720", width: 320, height: 720, mobile: true });

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await installApiMocks(page);
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  const main = page.locator("main[data-codex13-native='archive-video-wall']");
  await main.waitFor();
  assert.equal(await main.getAttribute("data-reduced-motion"), "true", "reduced-motion runtime policy must be active");
  const transitionDuration = await page.locator("[data-wall-slot]").first().evaluate((node) => getComputedStyle(node).transitionDuration);
  assert.ok(transitionDuration === "0s" || transitionDuration.split(",").every((value) => value.trim() === "0s"), `reduced-motion: card transition must be off, got ${transitionDuration}`);
  await context.close();
  console.log("CODEX13_LIQUID_GLASS_VIDEO_WALL_BROWSER_QA=PASS");
} finally {
  await browser.close();
}
