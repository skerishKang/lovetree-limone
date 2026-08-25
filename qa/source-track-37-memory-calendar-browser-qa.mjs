import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.V4_BASE_URL ?? "http://127.0.0.1:3000";
const screenshotDir = process.env.TRACK37_SCREENSHOT_DIR ?? "/tmp/track37-browser-qa";
const route = "/v4/trees/track37-qa/archive/calendar";

const tree = { id: "track37-qa", title: "Track37 QA Tree", ownerId: "qa-owner", visibility: "public" };
const memories = [
  { id: "qa-aug-01-a", treeId: tree.id, title: "8월 첫 기억", memo: "실제 저장일 8월 1일", sourceType: "youtube", sourceUrl: "", thumbnail: "", emotionTags: [], discoveryDate: "2026-08-01", timestamp: "2026-08-01", sortOrder: 0 },
  { id: "qa-aug-01-b", treeId: tree.id, title: "같은 날 두 번째 기억", memo: "같은 날짜의 별도 Moment", sourceType: "link", sourceUrl: "https://example.test/memory", thumbnail: "", emotionTags: [], discoveryDate: "2026-08-01T19:20:00+09:00", timestamp: "2026-08-01T19:20:00+09:00", sortOrder: 1 },
  { id: "qa-aug-10", treeId: tree.id, title: "8월 열흘 기억", memo: "실제 저장일 8월 10일", sourceType: "other", sourceUrl: "", thumbnail: "", emotionTags: [], discoveryDate: "2026-08-10", timestamp: "2026-08-10", sortOrder: 2 },
  { id: "qa-sep-02", treeId: tree.id, title: "9월 기억", memo: "실제 저장일 9월 2일", sourceType: "video", sourceUrl: "", thumbnail: "", emotionTags: [], discoveryDate: "2026-09-02", timestamp: "2026-09-02", sortOrder: 3 },
  { id: "qa-no-date", treeId: tree.id, title: "날짜 없는 기억", memo: "createdAt만 있어 달력에서 제외되어야 함", sourceType: "other", sourceUrl: "", thumbnail: "", emotionTags: [], discoveryDate: "", timestamp: "", createdAt: "2026-10-31T12:00:00Z", sortOrder: 4 },
];

async function installApiMocks(page) {
  await page.route("**/api/trees/track37-qa", async (routeHandle) => {
    await routeHandle.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tree) });
  });
  await page.route("**/api/trees/track37-qa/memories", async (routeHandle) => {
    await routeHandle.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(memories) });
  });
}

async function openPage(browser, viewport, reducedMotion = "no-preference") {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: Boolean(viewport.mobile),
    isMobile: Boolean(viewport.mobile),
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
  assert.ok(response?.ok(), `${viewport.name}: route must return 2xx`);
  await page.getByRole("heading", { name: "Track37 QA Tree" }).waitFor();
  return { context, page, pageErrors, consoleErrors };
}

async function assertNoOverflow(page, name) {
  const dimensions = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scrollWidth <= dimensions.innerWidth, `${name}: horizontal overflow ${dimensions.scrollWidth} > ${dimensions.innerWidth}`);
}

async function auditDesktop(browser) {
  const name = "desktop-1280x800";
  const { context, page, pageErrors, consoleErrors } = await openPage(browser, { name, width: 1280, height: 800 });
  await assertNoOverflow(page, name);

  await page.getByRole("button", { name: /2026\.08/ }).click();
  await page.getByRole("button", { name: /01/ }).last().click();
  await page.getByText("2026.08.01", { exact: true }).waitFor();
  assert.equal(await page.getByText("8월 첫 기억", { exact: true }).count(), 1, "stored date must expose first canonical Moment");
  assert.equal(await page.getByText("같은 날 두 번째 기억", { exact: true }).count(), 1, "same stored day must retain multiple Moments");
  assert.equal(await page.getByText("날짜 없는 기억", { exact: true }).count(), 0, "createdAt-only Moment must not be invented into calendar");

  const shell = page.locator("main[data-track37-native='archive-calendar']");
  await shell.focus();
  await page.keyboard.press("ArrowRight");
  await page.getByText("2026.08.10", { exact: true }).waitFor();
  await page.keyboard.press("ArrowLeft");
  await page.getByText("2026.08.01", { exact: true }).waitFor();

  const dateButton = page.getByRole("button", { name: /10/ }).last();
  await dateButton.focus();
  assert.equal(await dateButton.evaluate((node) => document.activeElement === node), true, "date index must be keyboard focusable");

  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: true });
  assert.deepEqual(pageErrors, [], `${name}: page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `${name}: console errors: ${consoleErrors.join(" | ")}`);
  await context.close();
}

async function auditMobile(browser, viewport) {
  const { context, page, pageErrors, consoleErrors } = await openPage(browser, viewport);
  await assertNoOverflow(page, viewport.name);

  const pad = page.getByTestId("track37-active-pad");
  await page.getByRole("button", { name: /2026\.08/ }).click();
  await page.getByRole("button", { name: /10/ }).last().click();
  await page.getByText("2026.08.10", { exact: true }).waitFor();

  const box = await pad.boundingBox();
  assert.ok(box, `${viewport.name}: active pad must have a box`);
  const y = box.y + Math.min(180, box.height / 2);
  await pad.dispatchEvent("pointerdown", { pointerId: 37, pointerType: "touch", clientX: box.x + 70, clientY: y, button: 0 });
  await pad.dispatchEvent("pointerup", { pointerId: 37, pointerType: "touch", clientX: box.x + 170, clientY: y, button: 0 });
  await page.getByText("2026.08.01", { exact: true }).waitFor();

  await page.screenshot({ path: `${screenshotDir}/${viewport.name}.png`, fullPage: true });
  assert.deepEqual(pageErrors, [], `${viewport.name}: page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `${viewport.name}: console errors: ${consoleErrors.join(" | ")}`);
  await context.close();
}

async function auditReducedMotion(browser) {
  const name = "reduced-motion-390x844";
  const { context, page, pageErrors, consoleErrors } = await openPage(browser, { name, width: 390, height: 844, mobile: true }, "reduce");
  await page.getByRole("button", { name: /2026\.08/ }).click();
  await page.getByRole("button", { name: /01/ }).last().click();
  await page.getByText("2026.08.01", { exact: true }).waitFor();
  await page.getByRole("button", { name: "다음 저장일 →" }).click();
  await page.getByText("2026.08.10", { exact: true }).waitFor();
  const animationName = await page.getByTestId("track37-active-pad").evaluate((node) => getComputedStyle(node).animationName);
  assert.ok(animationName === "none" || animationName === "", `reduced motion must not animate page tear, got ${animationName}`);
  assert.deepEqual(pageErrors, [], `${name}: page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `${name}: console errors: ${consoleErrors.join(" | ")}`);
  await context.close();
}

await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  await auditDesktop(browser);
  await auditMobile(browser, { name: "mobile-390x844", width: 390, height: 844, mobile: true });
  await auditMobile(browser, { name: "mobile-320x720", width: 320, height: 720, mobile: true });
  await auditReducedMotion(browser);
  console.log("TRACK37_MEMORY_CALENDAR_BROWSER_QA=PASS");
} finally {
  await browser.close();
}
