import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.V4_BASE_URL ?? "http://127.0.0.1:3000";
const screenshotDir = process.env.CINEMATIC_WATERCOLOR_SCREENSHOT_DIR ?? "/tmp/cinematic-watercolor-v2-browser-qa";
const route = "/v4/subjects/cinematic-watercolor-v2";

const posterFixture = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#7b8780"/><stop offset=".52" stop-color="#b87e8e"/><stop offset="1" stop-color="#d6c1a5"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><circle cx="760" cy="320" r="190" fill="#ead8ce" opacity=".42"/><path d="M120 520 C360 280 620 610 1120 210" fill="none" stroke="#7eb0aa" stroke-width="54" opacity=".42"/></svg>`;

async function openPage(browser, viewport, reducedMotion = "no-preference") {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: Boolean(viewport.mobile),
    isMobile: Boolean(viewport.mobile),
    reducedMotion,
  });
  const page = await context.newPage();
  await page.route("https://img.youtube.com/**", async (routeHandle) => {
    await routeHandle.fulfill({ status: 200, contentType: "image/svg+xml", body: posterFixture });
  });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  assert.ok(response?.ok(), `${viewport.name}: route must return 2xx`);
  const lens = page.locator("[data-cinematic-watercolor-subject-lens='true']");
  await lens.waitFor();
  await page.waitForFunction(() => document.querySelector("[data-cinematic-watercolor-subject-lens='true']")?.getAttribute("data-motion") !== null);
  return { context, page, lens, pageErrors, consoleErrors };
}

async function assertNoOverflow(page, name) {
  const dimensions = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scrollWidth <= dimensions.innerWidth, `${name}: horizontal overflow ${dimensions.scrollWidth} > ${dimensions.innerWidth}`);
}

async function pauseIfPlaying(page) {
  const pause = page.getByRole("button", { name: "Pause cinematic" });
  if (await pause.count()) await pause.click();
}

async function auditDesktop(browser) {
  const name = "desktop-1280x800";
  const { context, page, lens, pageErrors, consoleErrors } = await openPage(browser, { name, width: 1280, height: 800 });
  await pauseIfPlaying(page);
  await assertNoOverflow(page, name);

  assert.equal(await lens.getAttribute("data-product-boundary"), "visual-presentation-donor-only");
  assert.equal(await lens.getAttribute("data-source-phase"), "ONE_MOMENT");
  assert.equal(await page.locator("video, iframe").count(), 0, "donor lens must not pretend fingerprint-only source binaries are Product runtime");

  const stage = lens.locator("[tabindex='0']").first();
  await stage.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await lens.getAttribute("data-source-phase"), "AWAKENING", "ArrowRight must advance one cinematic phase");
  await page.keyboard.press("End");
  assert.equal(await lens.getAttribute("data-source-phase"), "SEASON_COVER", "End must reach the final cover");
  await page.keyboard.press("Home");
  assert.equal(await lens.getAttribute("data-source-phase"), "ONE_MOMENT", "Home must return to the opening phase");

  await lens.getByRole("button", { name: "여름의 여행 보기" }).click();
  await pauseIfPlaying(page);
  assert.equal(await lens.getByText("여름의 여행", { exact: true }).count() >= 1, true, "current SUBJECT selection must drive the lens");
  await page.keyboard.press("End");
  const archiveLink = lens.getByRole("link", { name: /선택한 앨범으로/ });
  assert.equal(await archiveLink.getAttribute("href"), "/v4/subjects/demo/orbit", "donor must hand off to the existing archive authority");
  assert.equal(await page.locator("[data-current-subject-authority='/v4/subjects']").count(), 1, "current SUBJECT library must remain on the same page");

  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: true });
  assert.deepEqual(pageErrors, [], `${name}: page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `${name}: console errors: ${consoleErrors.join(" | ")}`);
  await context.close();
}

async function auditMobile(browser, viewport) {
  const { context, page, lens, pageErrors, consoleErrors } = await openPage(browser, viewport);
  await pauseIfPlaying(page);
  await assertNoOverflow(page, viewport.name);

  const stage = lens.locator("[tabindex='0']").first();
  const box = await stage.boundingBox();
  assert.ok(box, `${viewport.name}: cinematic stage must have a box`);
  const y = box.y + Math.min(box.height * 0.5, 320);
  await stage.dispatchEvent("pointerdown", { pointerId: 492, pointerType: "touch", clientX: box.x + box.width * 0.72, clientY: y, button: 0 });
  await stage.dispatchEvent("pointerup", { pointerId: 492, pointerType: "touch", clientX: box.x + box.width * 0.32, clientY: y, button: 0 });
  assert.equal(await lens.getAttribute("data-source-phase"), "AWAKENING", `${viewport.name}: left swipe must advance`);

  const selected = lens.getByRole("button", { name: "주연 보기" });
  await selected.focus();
  assert.equal(await selected.evaluate((node) => document.activeElement === node), true, `${viewport.name}: SUBJECT selector must be focusable`);

  await page.screenshot({ path: `${screenshotDir}/${viewport.name}.png`, fullPage: true });
  assert.deepEqual(pageErrors, [], `${viewport.name}: page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `${viewport.name}: console errors: ${consoleErrors.join(" | ")}`);
  await context.close();
}

async function auditReducedMotion(browser) {
  const name = "reduced-motion-390x844";
  const { context, page, lens, pageErrors, consoleErrors } = await openPage(browser, { name, width: 390, height: 844, mobile: true }, "reduce");
  await page.waitForFunction(() => document.querySelector("[data-cinematic-watercolor-subject-lens='true']")?.getAttribute("data-motion") === "reduced");
  assert.equal(await lens.getAttribute("data-source-phase"), "SEASON_COVER", "reduced motion must use the final-cover fallback rather than autoplay");
  assert.equal(await page.getByRole("button", { name: "Play cinematic" }).isDisabled(), true, "reduced motion must not offer autoplay transport");
  const posterTransition = await lens.locator("[role='img']").first().evaluate((node) => getComputedStyle(node).transitionDuration);
  assert.ok(posterTransition === "0s" || posterTransition.split(",").every((value) => value.trim() === "0s"), `reduced motion transition must be disabled, got ${posterTransition}`);
  await assertNoOverflow(page, name);
  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: true });
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
  console.log("CODEX_WORK_13_CINEMATIC_WATERCOLOR_V2_BROWSER_QA=PASS");
} finally {
  await browser.close();
}
