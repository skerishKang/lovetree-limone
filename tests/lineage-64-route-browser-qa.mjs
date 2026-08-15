import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = process.env.LOVETREE_QA_BASE_URL || process.env.V4_BASE_URL || "http://127.0.0.1:3000";
const URL = `${BASE}/design-lab/lineages/64/v1-2-1`;

function captureErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
  return errors;
}

async function openRoute(browser, viewport, options = {}) {
  const context = await browser.newContext({ viewport, ...options });
  const page = await context.newPage();
  const errors = captureErrors(page);
  const response = await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  assert.ok(response?.ok(), `Lineage 64 route HTTP ${response?.status()}`);
  await page.locator('[data-rendering="css3d-dom"]').waitFor({ timeout: 15000 });
  return { context, page, errors };
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `${label}: horizontal overflow ${overflow}px`);
}

async function assertCenterVoidAndDepth(page, label) {
  assert.ok(await page.getByText("WELCOME BACK").isVisible(), `${label}: center Welcome void is readable`);
  assert.equal(await page.locator('[data-depth-tier="foreground"]').count(), 9, `${label}: 9 foreground cards`);
  assert.equal(await page.locator('[data-depth-tier="mid"]').count(), 13, `${label}: 13 mid cards`);
  assert.equal(await page.locator('[data-depth-tier="far"]').count(), 18, `${label}: 18 far cards`);
}

async function assertCardTapOpensViewer(page, label) {
  const firstCard = page.locator("[data-moment-id]").first();
  await firstCard.click({ force: true });
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ timeout: 8000 });
  const selectedId = await page.locator("[data-selected-moment-id]").getAttribute("data-selected-moment-id");
  assert.ok(selectedId?.startsWith("moment-"), `${label}: card tap opens Viewer for a real Moment (${selectedId})`);
  return selectedId;
}

async function assertDragDoesNotOpenViewer(page, label) {
  const box = await page.locator("[data-moment-id]").first().boundingBox();
  assert.ok(box, `${label}: card exists for drag`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 70, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  assert.equal(await page.getByRole("dialog").count(), 0, `${label}: drag above threshold does NOT open Viewer`);
}

async function assertListKeyboardOpenAndClose(page, label) {
  const toggle = page.getByRole("button", { name: /시맨틱 목록/ });
  await toggle.focus();
  await page.keyboard.press("Enter");
  const list = page.getByRole("listbox");
  await list.waitFor({ timeout: 5000 });
  const option = list.getByRole("option").nth(4); // Moment 05
  await option.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ timeout: 8000 });
  assert.equal(
    await page.locator("[data-selected-moment-id]").getAttribute("data-selected-moment-id"),
    "moment-05",
    `${label}: semantic list opens Viewer for the selected Moment`,
  );
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached", timeout: 5000 });
  assert.equal(await toggle.evaluate((node) => document.activeElement === node), true, `${label}: Escape restores focus to the list toggle`);
}

async function assertViewerFocusTrap(page, label) {
  const dialog = page.getByRole("dialog");
  const close = dialog.getByRole("button", { name: "닫기" });
  assert.equal(await close.evaluate((node) => document.activeElement === node), true, `${label}: Viewer moves focus to close control`);
  await page.keyboard.press("Shift+Tab");
  assert.notEqual(await close.evaluate((node) => document.activeElement === node), true, `${label}: Shift+Tab stays inside the Viewer`);
}

const browser = await chromium.launch({ headless: true });

try {
  const desktop = await openRoute(browser, { width: 1280, height: 800 });
  try {
    await assertNoHorizontalOverflow(desktop.page, "1280x800");
    await assertCenterVoidAndDepth(desktop.page, "1280x800");
    const openedId = await assertCardTapOpensViewer(desktop.page, "1280x800");
    await assertViewerFocusTrap(desktop.page, "1280x800");
    await desktop.page.keyboard.press("Escape");
    await desktop.page.getByRole("dialog").waitFor({ state: "detached", timeout: 5000 });
    const card = desktop.page.locator(`[data-moment-id="${openedId}"]`);
    assert.equal(await card.evaluate((node) => document.activeElement === node), true, "1280x800: Escape restores focus to the originating card");
    await assertDragDoesNotOpenViewer(desktop.page, "1280x800");
    await assertListKeyboardOpenAndClose(desktop.page, "1280x800");
    assert.deepEqual(desktop.errors, [], `1280x800: no console/page errors: ${desktop.errors.join(" | ")}`);
  } finally {
    await desktop.context.close();
  }

  for (const spec of [
    { label: "390x844", viewport: { width: 390, height: 844 } },
    { label: "320x720", viewport: { width: 320, height: 720 } },
  ]) {
    const mobile = await openRoute(browser, spec.viewport, { isMobile: true, hasTouch: true });
    try {
      await assertNoHorizontalOverflow(mobile.page, spec.label);
      await assertCenterVoidAndDepth(mobile.page, spec.label);
      await assertCardTapOpensViewer(mobile.page, spec.label);
      await mobile.page.keyboard.press("Escape");
      await mobile.page.getByRole("dialog").waitFor({ state: "detached", timeout: 5000 });
      assert.deepEqual(mobile.errors, [], `${spec.label}: no console/page errors: ${mobile.errors.join(" | ")}`);
    } finally {
      await mobile.context.close();
    }
  }

  const reduced = await openRoute(browser, { width: 390, height: 844 }, { reducedMotion: "reduce", isMobile: true, hasTouch: true });
  try {
    assert.equal(await reduced.page.locator('[data-rendering="css3d-dom"]').getAttribute("data-reduced-motion"), "reduce", "reduced motion disables ambient orbit flag");
    await assertCardTapOpensViewer(reduced.page, "reduced-motion");
    await reduced.page.keyboard.press("Escape");
    await reduced.page.getByRole("dialog").waitFor({ state: "detached", timeout: 5000 });
    assert.deepEqual(reduced.errors, [], `reduced motion: no console/page errors: ${reduced.errors.join(" | ")}`);
  } finally {
    await reduced.context.close();
  }

  console.log("LINEAGE_64_ROUTE_BROWSER_QA_PASS");
} finally {
  await browser.close();
}
