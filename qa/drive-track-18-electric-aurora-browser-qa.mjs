import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.V4_BASE_URL ?? "http://127.0.0.1:3000";
const screenshotDir = process.env.ELECTRIC_AURORA_SCREENSHOT_DIR ?? "/tmp/electric-aurora-browser-qa";
const route = "/design-lab/drive-track-18-electric-aurora";

await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function auditViewport({ name, width, height, mobile = false }) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  assert.ok(response?.ok(), `${name}: route must return 2xx`);
  await page.getByRole("heading", { name: "Memory Core · Electric Aurora" }).waitFor();

  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(dimensions.scrollWidth <= dimensions.innerWidth, `${name}: horizontal overflow ${dimensions.scrollWidth} > ${dimensions.innerWidth}`);

  const momentButtons = page.locator('button[aria-pressed]');
  assert.equal(await momentButtons.count(), 6, `${name}: six canonical Moment controls expected`);
  const first = momentButtons.nth(0);
  const second = momentButtons.nth(1);
  await first.focus();
  assert.equal(await first.evaluate((node) => node === document.activeElement), true, `${name}: Moment control must accept focus`);
  await page.keyboard.press("ArrowRight");
  assert.equal(await second.getAttribute("aria-pressed"), "true", `${name}: ArrowRight must move the single selection`);
  assert.equal(await second.evaluate((node) => node === document.activeElement), true, `${name}: keyboard selection must move focus`);

  if (mobile) {
    const third = momentButtons.nth(2);
    await third.tap();
    assert.equal(await third.getAttribute("aria-pressed"), "true", `${name}: touch selection must work`);
  }

  const truth = await page.getByLabel("데이터 권위").innerText();
  assert.match(truth, /Tree \/ Moment/, `${name}: canonical authority disclosure missing`);
  assert.match(truth, /새 energy · importance · status 필드 없음/, `${name}: demo-semantics boundary missing`);
  assert.equal(await page.locator("iframe").count(), 0, `${name}: donor must not add external iframe/runtime`);
  assert.equal(await page.locator('script[src^="http"]').count(), 0, `${name}: donor must not add remote scripts`);

  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: true });
  assert.deepEqual(consoleErrors, [], `${name}: console errors: ${consoleErrors.join(" | ")}`);
  assert.deepEqual(pageErrors, [], `${name}: page errors: ${pageErrors.join(" | ")}`);
  await context.close();
}

try {
  await auditViewport({ name: "desktop-1280x800", width: 1280, height: 800 });
  await auditViewport({ name: "mobile-390x844", width: 390, height: 844, mobile: true });
  await auditViewport({ name: "mobile-320x720", width: 320, height: 720, mobile: true });

  const reducedContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const reducedPage = await reducedContext.newPage();
  const reducedErrors = [];
  reducedPage.on("console", (message) => { if (message.type() === "error") reducedErrors.push(message.text()); });
  const response = await reducedPage.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  assert.ok(response?.ok(), "reduced-motion: route must return 2xx");
  await reducedPage.getByRole("heading", { name: "Memory Core · Electric Aurora" }).waitFor();
  const reducedRoot = reducedPage.locator('main[data-reduced-motion="true"]');
  await reducedRoot.waitFor({ state: "visible" });
  assert.equal(await reducedRoot.getAttribute("data-reduced-motion"), "true", "reduced-motion: JS motion policy must be active");
  const runningAnimations = await reducedPage.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
  assert.equal(runningAnimations, 0, "reduced-motion: ambient CSS animation must stop");
  const controls = reducedPage.locator('button[aria-pressed]');
  await controls.nth(0).focus();
  await reducedPage.keyboard.press("ArrowRight");
  assert.equal(await controls.nth(1).getAttribute("aria-pressed"), "true", "reduced-motion: manual keyboard selection remains available");
  assert.deepEqual(reducedErrors, [], `reduced-motion: console errors: ${reducedErrors.join(" | ")}`);
  await reducedContext.close();

  console.log("DRIVE_TRACK_18_ELECTRIC_AURORA_BROWSER_QA=PASS");
} finally {
  await browser.close();
}
