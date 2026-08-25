import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.V4_BASE_URL ?? "http://127.0.0.1:3000";
const screenshotDir = process.env.CODEX14_SCREENSHOT_DIR ?? "/tmp/codex14-rotating-index-qa";
const route = "/v4/trees/codex14-qa/archive/rotating-index";

const tree = { id: "codex14-qa", title: "Rotating QA Tree", ownerId: "qa-owner", visibility: "public" };
const memories = Array.from({ length: 9 }, (_, index) => ({
  id: `qa-${index + 1}`,
  treeId: tree.id,
  title: `기억 ${index + 1}`,
  memo: `회전 아카이브 QA 메모 ${index + 1}`,
  sourceType: "text",
  sourceUrl: "",
  thumbnail: "",
  emotionTags: index % 2 === 0 ? ["따뜻함"] : ["설렘"],
  discoveryDate: `2026-05-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
  timestamp: `2026-05-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
  sortOrder: index,
}));

async function installApiMocks(page) {
  await page.route("**/api/trees/codex14-qa", async (routeHandle) => {
    await routeHandle.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tree) });
  });
  await page.route("**/api/trees/codex14-qa/memories", async (routeHandle) => {
    await routeHandle.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(memories) });
  });
}

async function selectedTitle(page) {
  return page.locator("button[aria-current='true'] strong").first().textContent();
}

async function auditViewport(browser, { name, width, height, mobile = false }) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile });
  const page = await context.newPage();
  await installApiMocks(page);
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  assert.ok(response?.ok(), `${name}: route must return 2xx`);
  const main = page.locator("main[data-codex14-native='archive']");
  await main.waitFor();
  await page.getByRole("heading", { name: "기억 1" }).waitFor();

  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(dimensions.scrollWidth <= dimensions.innerWidth, `${name}: horizontal overflow ${dimensions.scrollWidth} > ${dimensions.innerWidth}`);

  if (mobile) {
    await page.getByRole("button", { name: "기억 2 선택" }).tap();
    assert.equal(await selectedTitle(page), "기억 2", `${name}: touch tap must select canonical Moment`);
    await page.getByRole("button", { name: "다음 기억" }).tap();
    assert.equal(await selectedTitle(page), "기억 3", `${name}: touch transport must advance`);
  } else {
    await main.focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await selectedTitle(page), "기억 2", `${name}: ArrowRight must advance`);
    await page.keyboard.press("ArrowLeft");
    assert.equal(await selectedTitle(page), "기억 1", `${name}: ArrowLeft must reverse`);
    await page.keyboard.press("Space");
    assert.equal(await page.getByRole("button", { name: "자동 회전 시작" }).getAttribute("aria-pressed"), "false", `${name}: Space must pause auto rotation`);
    await page.keyboard.press("i");
    const indexDialog = page.getByRole("dialog", { name: "Moving Memory Index" });
    await indexDialog.waitFor();
    assert.ok(await indexDialog.isVisible(), `${name}: keyboard I must open index`);
    await page.keyboard.press("Escape");
    await indexDialog.waitFor({ state: "hidden" });

    const selectedCard = page.locator("button[data-codex14-card='true'][aria-current='true']");
    const box = await selectedCard.boundingBox();
    assert.ok(box, `${name}: selected spatial card must have a pointer target`);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 72, box.y + box.height / 2, { steps: 4 });
    await page.mouse.up();
    assert.equal(await selectedTitle(page), "기억 2", `${name}: spatial drag must advance exactly one Moment without activating the card`);
  }

  const inspect = page.getByRole("button", { name: "기억 자세히 보기" });
  await inspect.click();
  const inspector = page.getByRole("dialog", { name: /기억 \d+/ });
  await inspector.waitFor();
  assert.ok(await inspector.isVisible(), `${name}: selected Moment inspector must open`);
  await page.keyboard.press("Escape");
  await inspector.waitFor({ state: "hidden" });
  await page.waitForFunction(() => document.activeElement?.textContent?.includes("기억 자세히 보기"));

  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: true });
  assert.deepEqual(pageErrors, [], `${name}: page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `${name}: console errors: ${consoleErrors.join(" | ")}`);
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
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  const main = page.locator("main[data-codex14-native='archive']");
  await main.waitFor();
  assert.equal(await main.getAttribute("data-reduced-motion"), "true", "reduced-motion: media query must be reflected in runtime state");
  const autoButton = page.getByRole("button", { name: "모션 감소 설정으로 자동 회전 사용 안 함" });
  await autoButton.waitFor();
  assert.equal(await autoButton.isDisabled(), true, "reduced-motion: automatic spatial rotation must be disabled");
  const transitionDuration = await page.locator("button[aria-current='true']").first().evaluate((node) => getComputedStyle(node).transitionDuration);
  assert.ok(transitionDuration === "0s" || transitionDuration.split(",").every((part) => part.trim() === "0s"), `reduced-motion: card transition must be off, got ${transitionDuration}`);
  await page.getByRole("button", { name: "다음 기억" }).tap();
  assert.equal(await selectedTitle(page), "기억 2", "reduced-motion: semantic touch traversal remains available");
  assert.deepEqual(pageErrors, [], `reduced-motion: page errors: ${pageErrors.join(" | ")}`);
  await context.close();
  console.log("CODEX14_ROTATING_MEMORY_INDEX_BROWSER_QA=PASS");
} finally {
  await browser.close();
}
