import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.V4_BASE_URL ?? "http://127.0.0.1:3000";
const screenshotDir = process.env.CODEX13_SCREENSHOT_DIR ?? "/tmp/codex13-browser-qa";
const route = "/v4/trees/codex13-qa/archive/video-wall";
const pixel = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Cdefs%3E%3ClinearGradient id='g' x2='1' y2='1'%3E%3Cstop stop-color='%23364253'/%3E%3Cstop offset='1' stop-color='%230e131b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='640' height='360' fill='url(%23g)'/%3E%3C/svg%3E";
const tinyWebmBase64 = "GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAISEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHWTbuMU6uEElTDZ1OsggEjTbuMU6uEHFO7a1OsggH87AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsCrXsYMPQkBNgIxMYXZmNjEuNy4xMDNXQYxMYXZmNjEuNy4xMDNEiYhAXgAAAAAAABZUrmvIrgEAAAAAAAA/14EBc8WIReQDyixbYGycgQAitZyDdW5kiIEAhoVWX1ZQOYOBASPjg4QCYloA4JCwgRC6gRCagQJVsIRVuYEBElTDZ0B/c3OfY8CAZ8iZRaOHRU5DT0RFUkSHjExhdmY2MS43LjEwM3Nz2mPAi2PFiEXkA8osW2BsZ8ilRaOHRU5DT0RFUkSHmExhdmM2MS4xOS4xMDEgbGlidnB4LXZwOWfIoUWjiERVUkFUSU9ORIeTMDA6MDA6MDAuMTIwMDAwMDAwAB9DtnXP54EAo6CBAACAgkmDQgAA8AD2ADgkHBhKAAAwYAAAEL///UiMAKOTgQAoAIYAQJKcAFAAAAMgAABCQKOTgQBQAIYAQJKcAE7gAAMgAABCQBxTu2uRu4+zgQC3iveBAfGCAajwgQM=";

const tree = { id: "codex13-qa", title: "Codex13 QA Tree", ownerId: "qa-owner", visibility: "public" };
const memories = Array.from({ length: 9 }, (_, index) => ({
  id: `qa-${index + 1}`,
  treeId: tree.id,
  title: `기억 ${index + 1}`,
  memo: `공간형 아카이브 QA ${index + 1}`,
  sourceType: "video",
  sourceUrl: `https://media.codex13.test/qa-${index + 1}.webm`,
  thumbnail: pixel,
  emotionTags: [index % 2 === 0 ? "설렘" : "기억"],
  discoveryDate: `2026-05-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
  timestamp: `2026-05-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
  sortOrder: index,
}));

async function installApiMocks(page) {
  await page.route("https://media.codex13.test/**", async (routeHandle) => {
    await routeHandle.fulfill({
      status: 200,
      contentType: "video/webm",
      body: Buffer.from(tinyWebmBase64, "base64"),
    });
  });
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

async function readWallState(page) {
  return page.evaluate(() => ({
    cells: document.querySelectorAll("[data-wall-slot]").length,
    liveWallVideos: document.querySelectorAll("[data-wall-slot] video").length,
    flaggedLiveVideos: document.querySelectorAll("[data-live-video='true'] video").length,
  }));
}

async function assertDecoderBudget(page, name, expectedCells, activeLimit, requireActive = true) {
  const state = await readWallState(page);
  assert.equal(state.cells, expectedCells, `${name}: wall DOM window must remain bounded`);
  assert.equal(state.liveWallVideos, state.flaggedLiveVideos, `${name}: only budget-selected wall slots may retain <video> nodes`);
  if (requireActive) assert.ok(state.liveWallVideos > 0, `${name}: decoder QA must exercise at least one live direct-video node`);
  assert.ok(state.liveWallVideos <= activeLimit, `${name}: live wall video nodes ${state.liveWallVideos} exceed ${activeLimit}`);
  return state;
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
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  assert.ok(response?.ok(), `${name}: route must return 2xx`);
  await page.getByRole("heading", { name: "Codex13 QA Tree" }).waitFor();
  const main = page.locator("main[data-codex13-native='archive-video-wall']");
  const viewport = page.locator("section[aria-label='공간형 비디오 아카이브']");
  await main.waitFor();
  await assertNoOverflow(page, name);

  const expectedCells = mobile ? 25 : 35;
  const activeLimit = Number(await main.getAttribute("data-active-video-limit"));
  assert.equal(activeLimit, mobile ? 2 : 6, `${name}: decoder budget must match viewport class`);
  await assertDecoderBudget(page, `${name}: initial`, expectedCells, activeLimit, true);

  if (!mobile) {
    await main.focus();
    const nearest = page.locator("[data-wall-slot][tabindex='0']").first();
    const beforeSlot = await nearest.getAttribute("data-wall-slot");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(50);
    const afterSlot = await page.locator("[data-wall-slot][tabindex='0']").first().getAttribute("data-wall-slot");
    assert.notEqual(afterSlot, beforeSlot, `${name}: ArrowRight must move a different wall cell into the nearest position`);
    await assertDecoderBudget(page, `${name}: keyboard travel`, expectedCells, activeLimit, true);

    const beforeWheelStyle = await page.locator("[data-wall-slot='0']").getAttribute("style");
    await viewport.hover();
    await page.mouse.wheel(0, 720);
    await page.waitForTimeout(50);
    let afterWheelStyle = await page.locator("[data-wall-slot='0']").getAttribute("style");
    if (afterWheelStyle === beforeWheelStyle) {
      await viewport.dispatchEvent("wheel", { deltaX: 0, deltaY: 720, deltaMode: 0 });
      await page.waitForTimeout(50);
      afterWheelStyle = await page.locator("[data-wall-slot='0']").getAttribute("style");
    }
    assert.notEqual(afterWheelStyle, beforeWheelStyle, `${name}: wheel must change spatial presentation state`);
    await assertDecoderBudget(page, `${name}: wheel travel`, expectedCells, activeLimit, true);

    const box = await viewport.boundingBox();
    assert.ok(box, `${name}: wall viewport must have a bounding box`);
    const beforeDragStyle = await page.locator("[data-wall-slot='0']").getAttribute("style");
    await page.mouse.move(box.x + box.width * 0.48, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.58, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(50);
    const afterDragStyle = await page.locator("[data-wall-slot='0']").getAttribute("style");
    assert.notEqual(afterDragStyle, beforeDragStyle, `${name}: pointer drag must change spatial presentation state`);
    await assertDecoderBudget(page, `${name}: pointer drag`, expectedCells, activeLimit, true);

    await main.focus();
    await page.keyboard.press("Home");
    await page.waitForTimeout(50);
    await assertDecoderBudget(page, `${name}: Home reset`, expectedCells, activeLimit, true);
  }

  const nearestButton = page.locator("[data-wall-slot][tabindex='0']").first();
  if (mobile) await nearestButton.tap();
  else await nearestButton.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  assert.ok(await dialog.isVisible(), `${name}: selected Moment inspector must open`);
  const inspectorVideos = await dialog.locator("video").count();
  assert.equal(inspectorVideos, 1, `${name}: direct-video Moment must render exactly one inspector video`);
  const suspended = await readWallState(page);
  assert.equal(suspended.liveWallVideos, 0, `${name}: inspector open must unmount every wall video decoder`);
  assert.equal(suspended.flaggedLiveVideos, 0, `${name}: inspector open must clear every live-video slot`);

  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  assert.equal(await nearestButton.evaluate((node) => document.activeElement === node), true, `${name}: inspector must restore trigger focus`);
  await page.waitForFunction(
    () => document.querySelectorAll("[data-wall-slot] video").length > 0,
    null,
    { timeout: 2000 },
  );
  await assertDecoderBudget(page, `${name}: post-inspector resume`, expectedCells, activeLimit, true);

  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: true });
  assert.deepEqual(pageErrors, [], `${name}: page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `${name}: console errors: ${consoleErrors.join(" | ")}`);
  await context.close();
}

await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  await auditViewport(browser, { name: "desktop-1280x800", width: 1280, height: 800, reducedMotion: "reduce" });
  await auditViewport(browser, { name: "mobile-390x844", width: 390, height: 844, mobile: true, reducedMotion: "reduce" });
  await auditViewport(browser, { name: "mobile-320x720", width: 320, height: 720, mobile: true, reducedMotion: "reduce" });

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await installApiMocks(page);
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  const main = page.locator("main[data-codex13-native='archive-video-wall']");
  await main.waitFor();
  assert.equal(await main.getAttribute("data-reduced-motion"), "true", "reduced-motion runtime policy must be active");
  const transitionDuration = await page.locator("[data-wall-slot]").first().evaluate((node) => getComputedStyle(node).transitionDuration);
  assert.ok(transitionDuration === "0s" || transitionDuration.split(",").every((value) => value.trim() === "0s"), `reduced-motion: card transition must be off, got ${transitionDuration}`);
  const before = await page.locator("[data-wall-slot='0']").getAttribute("style");
  await page.waitForTimeout(120);
  const after = await page.locator("[data-wall-slot='0']").getAttribute("style");
  assert.equal(after, before, "reduced-motion: ambient/inertial presentation loop must not move the wall");
  await context.close();
  console.log("CODEX13_LIQUID_GLASS_VIDEO_WALL_BROWSER_QA=PASS");
} finally {
  await browser.close();
}
