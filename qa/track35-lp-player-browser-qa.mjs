import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.V4_BASE_URL ?? "http://127.0.0.1:3000";
const screenshotDir = process.env.TRACK35_SCREENSHOT_DIR ?? "/tmp/track35-browser-qa";
const route = "/v4/trees/track35-qa/archive/lp";

const tree = { id: "track35-qa", title: "Track35 QA Tree", ownerId: "qa-owner", visibility: "public" };
const memories = [
  { id: "qa-1", treeId: tree.id, title: "첫 번째 기억", memo: "첫 메모", sourceType: "text", sourceUrl: "", thumbnail: "", emotionTags: ["설렘"], discoveryDate: "2026-05-01T12:00:00.000Z", timestamp: "2026-05-01T12:00:00.000Z", sortOrder: 0 },
  { id: "qa-2", treeId: tree.id, title: "두 번째 기억", memo: "두 메모", sourceType: "image", sourceUrl: "", thumbnail: "", emotionTags: ["따뜻함"], discoveryDate: "2026-05-02T12:00:00.000Z", timestamp: "2026-05-02T12:00:00.000Z", sortOrder: 1 },
  { id: "qa-3", treeId: tree.id, title: "세 번째 기억", memo: "세 메모", sourceType: "music", sourceUrl: "", thumbnail: "", emotionTags: ["그리움"], discoveryDate: "2026-05-03T12:00:00.000Z", timestamp: "2026-05-03T12:00:00.000Z", sortOrder: 2 },
];

async function installApiMocks(page) {
  await page.route("**/api/trees/track35-qa", async (routeHandle) => {
    await routeHandle.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tree) });
  });
  await page.route("**/api/trees/track35-qa/memories", async (routeHandle) => {
    await routeHandle.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(memories) });
  });
}

async function auditViewport(browser, { name, width, height, mobile = false }) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile });
  const page = await context.newPage();
  await installApiMocks(page);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  assert.ok(response?.ok(), `${name}: route must return 2xx`);
  await page.getByRole("heading", { name: "Track35 QA Tree" }).waitFor();

  const dimensions = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scrollWidth <= dimensions.innerWidth, `${name}: horizontal overflow ${dimensions.scrollWidth} > ${dimensions.innerWidth}`);

  if (mobile) {
    await page.getByRole("button", { name: /두 번째 기억/ }).tap();
    await page.getByText("두 번째 기억", { exact: true }).first().waitFor();
  } else {
    await page.locator("main[data-track35-native='archive']").focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.getByLabel("LP 기억 트랙 위치").inputValue(), "1", `${name}: ArrowRight must select next Moment`);
    await page.keyboard.press("ArrowLeft");
    assert.equal(await page.getByLabel("LP 기억 트랙 위치").inputValue(), "0", `${name}: ArrowLeft must select previous Moment`);
    await page.keyboard.press("Space");
    assert.equal(await page.getByRole("button", { name: "자동 넘김 일시정지" }).getAttribute("aria-pressed"), "true", `${name}: Space must toggle archive transport`);
  }

  const inspect = page.getByRole("button", { name: "기억 열기" });
  await inspect.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  assert.ok(await dialog.isVisible(), `${name}: inspector dialog must open`);
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await page.waitForTimeout(50);
  assert.equal(await inspect.evaluate((node) => document.activeElement === node), true, `${name}: inspector must restore trigger focus`);

  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: true });
  assert.deepEqual(pageErrors, [], `${name}: page errors: ${pageErrors.join(" | ")}`);
  await context.close();
}

await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  await auditViewport(browser, { name: "desktop-1280x800", width: 1280, height: 800 });
  await auditViewport(browser, { name: "mobile-390x844", width: 390, height: 844, mobile: true });
  await auditViewport(browser, { name: "mobile-320x720", width: 320, height: 720, mobile: true });

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await installApiMocks(page);
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  const disabledTransport = page.getByRole("button", { name: "모션 감소 설정으로 자동 넘김 사용 안 함" });
  await disabledTransport.waitFor();
  assert.equal(await disabledTransport.isDisabled(), true, "reduced-motion: automatic LP motion must be disabled");
  const animationName = await page.locator("[data-track35-platter]").evaluate((node) => getComputedStyle(node).animationName);
  assert.ok(animationName === "none" || animationName === "", `reduced-motion: platter animation must be off, got ${animationName}`);
  await context.close();
  console.log("TRACK35_LP_PLAYER_BROWSER_QA=PASS");
} finally {
  await browser.close();
}
