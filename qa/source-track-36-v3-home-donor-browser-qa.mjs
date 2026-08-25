import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.V4_BASE_URL ?? "http://127.0.0.1:3000";
const screenshotDir = process.env.TRACK36_SCREENSHOT_DIR ?? "/tmp/track36-browser-qa";
const donorPath = "/design-lab/source-tracks/36/v3/donor";
const canonicalPath = "/v4";
const comparatorPath = "/design-lab/source-tracks/74/v2/native";

await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function auditViewport({ name, width, height, mobile = false }) {
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: mobile,
    isMobile: mobile,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto(`${baseUrl}${donorPath}`, { waitUntil: "networkidle" });
  assert.ok(response?.ok(), `${name}: donor route must return 2xx`);
  await page.getByRole("heading", { name: /기억으로 들어가는 순간만/ }).waitFor();

  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(
    dimensions.scrollWidth <= dimensions.innerWidth,
    `${name}: horizontal overflow ${dimensions.scrollWidth} > ${dimensions.innerWidth}`,
  );

  const hrefs = await page.locator("a[href]").evaluateAll((anchors) =>
    anchors.map((anchor) => anchor.getAttribute("href")),
  );
  assert.ok(hrefs.length >= 3, `${name}: expected review/canonical links`);
  assert.ok(hrefs.every((href) => typeof href === "string" && href.startsWith("/")), `${name}: unresolved/non-repository href found: ${hrefs.join(", ")}`);
  assert.ok(hrefs.includes(canonicalPath), `${name}: canonical /v4 link missing`);
  assert.ok(hrefs.includes(comparatorPath), `${name}: Track74 comparator link missing`);
  assert.equal(await page.locator("iframe").count(), 0, `${name}: donor must not embed source iframe`);

  let keyboardReachedAction = false;
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab");
    const activeText = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
    if (activeText.includes("현재 LoveTree로 들어가기")) {
      keyboardReachedAction = true;
      break;
    }
  }
  assert.ok(keyboardReachedAction, `${name}: primary action must be keyboard reachable`);

  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: true });
  assert.deepEqual(consoleErrors, [], `${name}: console errors: ${consoleErrors.join(" | ")}`);
  assert.deepEqual(pageErrors, [], `${name}: page errors: ${pageErrors.join(" | ")}`);

  if (mobile) {
    const primary = page.getByRole("button", { name: "현재 LoveTree로 들어가기" });
    await primary.tap();
    await page.waitForURL((url) => url.pathname === canonicalPath, { timeout: 5000 });
    assert.equal(new URL(page.url()).pathname, canonicalPath, `${name}: touch handoff must land on canonical /v4`);
  }

  await context.close();
}

try {
  await auditViewport({ name: "desktop-1280x800", width: 1280, height: 800 });
  await auditViewport({ name: "mobile-390x844", width: 390, height: 844, mobile: true });

  const reducedContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const reducedPage = await reducedContext.newPage();
  const response = await reducedPage.goto(`${baseUrl}${donorPath}`, { waitUntil: "networkidle" });
  assert.ok(response?.ok(), "reduced-motion: donor route must return 2xx");
  const start = Date.now();
  await reducedPage.getByRole("button", { name: "현재 LoveTree로 들어가기" }).click();
  await reducedPage.waitForURL((url) => url.pathname === canonicalPath, { timeout: 2500 });
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 700, `reduced-motion handoff should not wait for cinematic delay (elapsed=${elapsed}ms)`);
  await reducedContext.close();

  console.log("TRACK36_V3_HOME_DONOR_BROWSER_QA=PASS");
} finally {
  await browser.close();
}
