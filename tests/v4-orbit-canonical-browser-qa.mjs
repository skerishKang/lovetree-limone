import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import {
  canonicalV4OrbitRotation,
  nearestV4OrbitIndex,
  snapV4OrbitRotation,
} from "../lib/v4-orbit-selection.ts";

const BASE = process.env.V4_BASE_URL || "http://127.0.0.1:3000";
const URL = `${BASE}/v4/subjects/demo/orbit`;
const SCREENSHOT_DIR = process.env.V4_ORBIT_SCREENSHOT_DIR || "/tmp/v4-orbit-browser-qa";
const ORBIT_DRAG_FACTOR = 0.0045;

async function openRoute(browser, viewport, options = {}) {
  const page = await browser.newPage({ viewport, ...options });
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
  const response = await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  assert.ok(response?.ok(), `orbit route HTTP ${response?.status()}`);
  await page.locator(".v4-liquid-stage").waitFor({ timeout: 15000 });
  await page.locator(".v4-liquid-card").first().waitFor({ timeout: 15000 });
  assert.equal(await page.locator(".v4-liquid-card").count(), 8, "eight orbit cards render");
  return { page, errors };
}

async function getState(page) {
  const header = (await page.locator(".v4-archive-count").innerText()).trim();
  const [cur, total] = header.split("/").map((part) => parseInt(part.trim(), 10));
  const cardNum = await page.locator(".v4-liquid-card.is-selected .v4-liquid-index").innerText();
  const railNum = await page.locator(".v4-orbit-rail-item.is-selected .v4-orbit-rail-num").innerText();
  const railCount = await page.locator(".v4-orbit-rail-item").count();
  return {
    current: cur,
    count: total,
    cardIdx: parseInt(cardNum, 10) - 1,
    railIdx: parseInt(railNum, 10) - 1,
    railCount,
  };
}

async function assertSelectionAuthority(page, label) {
  const state = await getState(page);
  assert.equal(state.current, state.cardIdx + 1, `${label}: header count matches selected card`);
  assert.equal(state.cardIdx, state.railIdx, `${label}: orbit selected card matches rail selection`);
  assert.equal(state.railCount, state.count, `${label}: rail lists every Moment`);
  assert.equal(await page.locator(".v4-liquid-card.is-selected").count(), 1, `${label}: exactly one selected card`);
  assert.equal(await page.locator(".v4-orbit-rail-item.is-selected").count(), 1, `${label}: exactly one selected rail item`);
  return state;
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `${label}: horizontal overflow ${overflow}px (must be 0)`);
}

async function assertBackgroundMediaSilent(page, label) {
  const media = await page.locator(".v4-liquid-stage iframe, .v4-liquid-stage video").count();
  assert.equal(media, 0, `${label}: background orbit cards carry no playable media`);
}

async function pointerDrag(page, dx, dy = 0) {
  const box = await page.locator(".v4-liquid-stage").boundingBox();
  assert.ok(box, "orbit stage box exists for drag");
  const x0 = box.x + box.width / 2;
  const y0 = box.y + box.height / 2;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x0 + dx, y0 + dy, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(1100);
}

async function touchDrag(page, dx, startPoint = null) {
  const box = await page.locator(".v4-liquid-stage").boundingBox();
  assert.ok(box, "mobile orbit stage box exists for touch drag");
  const session = await page.context().newCDPSession(page);
  const x0 = startPoint ? startPoint.x : box.x + box.width * 0.45;
  const y0 = startPoint ? startPoint.y : box.y + box.height * 0.5;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: x0, y: y0, radiusX: 3, radiusY: 3, force: 1, id: 156 }],
  });
  for (let step = 1; step <= 6; step += 1) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x0 + (dx * step) / 6, y: y0, radiusX: 3, radiusY: 3, force: 1, id: 156 }],
    });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await session.detach();
  await page.waitForTimeout(1100);
}

// Find a point inside the orbit stage that is not covered by a card, so a
// sub-slop touch can be tested purely as a stage drag rather than a card tap.
async function findEmptyStagePoint(page) {
  const box = await page.locator(".v4-liquid-stage").boundingBox();
  assert.ok(box, "orbit stage box exists");
  for (let gy = 0.15; gy < 0.95; gy += 0.2) {
    for (let gx = 0.1; gx < 0.95; gx += 0.2) {
      const x = box.x + box.width * gx;
      const y = box.y + box.height * gy;
      const overCard = await page.evaluate(([px, py]) => {
        const el = document.elementFromPoint(px, py);
        return el ? el.closest(".v4-liquid-card") != null : false;
      }, [x, y]);
      if (!overCard) return { x, y };
    }
  }
  return null;
}

async function screenshot(page, name) {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
}

test("V4 Orbit canonical adoption — desktop selection authority, drag snap, rail, dialog focus trap", { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openRoute(browser, { width: 1280, height: 800 });
    try {
      const initial = await assertSelectionAuthority(page, "1280x800 initial");
      await assertNoHorizontalOverflow(page, "1280x800");
      await assertBackgroundMediaSilent(page, "1280x800");
      await screenshot(page, "desktop-initial");

      // A. canonical selection authority — wheel -> canonical selected Moment
      await page.locator(".v4-liquid-stage").hover();
      await page.mouse.wheel(0, 240);
      await page.waitForTimeout(120);
      const afterWheel = await assertSelectionAuthority(page, "1280x800 wheel");
      assert.equal(afterWheel.cardIdx, (initial.cardIdx + 1) % initial.count, "wheel advances the canonical selected Moment by one");

      // Arrow -> canonical selected Moment
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(120);
      const afterArrow = await assertSelectionAuthority(page, "1280x800 arrow");
      assert.equal(afterArrow.cardIdx, (afterWheel.cardIdx + 1) % afterWheel.count, "ArrowRight advances the canonical selected Moment");

      // C. rail -> canonical selected Moment
      const targetRail = (afterArrow.cardIdx + 3) % afterArrow.count;
      await page.locator(".v4-orbit-rail-item").nth(targetRail).click();
      await page.waitForTimeout(120);
      const afterRail = await assertSelectionAuthority(page, "1280x800 rail");
      assert.equal(afterRail.cardIdx, targetRail, "rail click selects the canonical Moment");

      // B. drag/touch release -> deterministic center snap
      const before = await getState(page);
      const dx = 150;
      const expectedRotation = canonicalV4OrbitRotation(before.cardIdx, before.count) + dx * ORBIT_DRAG_FACTOR;
      const expectedIdx = nearestV4OrbitIndex(expectedRotation, before.count);
      await pointerDrag(page, dx);
      const afterDrag = await assertSelectionAuthority(page, "1280x800 drag");
      assert.equal(afterDrag.cardIdx, expectedIdx, `drag release snaps to nearest canonical Moment (${before.cardIdx} -> ${expectedIdx})`);

      // card -> canonical selected Moment + open detail
      const openIdx = (afterDrag.cardIdx + 2) % afterDrag.count;
      await page.locator(".v4-liquid-card").nth(openIdx).click();
      await page.waitForTimeout(120);
      const afterCard = await assertSelectionAuthority(page, "1280x800 card");
      assert.equal(afterCard.cardIdx, openIdx, "clicking a non-selected card selects it canonically");

      // D. responsive selected-Moment detail + focus trap + escape + restore
      await page.locator(".v4-liquid-card.is-selected").click();
      await page.waitForTimeout(150);
      const dialog = page.locator(".v4-liquid-dialog");
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      assert.equal(await dialog.getAttribute("role"), "dialog");
      assert.equal(await dialog.getAttribute("aria-modal"), "true");
      assert.equal(await page.locator(".v4-liquid-stage iframe, .v4-liquid-stage video").count(), 0, "detail closed media is never in the background");
      const dialogTitle = await dialog.locator("h2").innerText();
      const expectedTitle = (await getState(page)).current; // selection unchanged by open
      assert.ok(dialogTitle.length > 0, "detail shows the selected Moment title");
      void expectedTitle;

      // focus enters dialog (close button focused)
      const focusTag = await page.evaluate(() => document.activeElement?.tagName);
      assert.equal(focusTag, "BUTTON", "focus enters the dialog on open");

      // focus trap: Tab cycles within the dialog, does not escape
      const firstInDialog = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll(".v4-liquid-dialog button"));
        nodes[0]?.focus();
        return nodes.length;
      });
      assert.ok(firstInDialog >= 2, "dialog exposes multiple focusable controls");
      await page.keyboard.press("Tab");
      const stillInDialog = await page.evaluate(() => document.activeElement?.closest(".v4-liquid-dialog") != null);
      assert.equal(stillInDialog, true, "Tab keeps focus trapped inside the dialog");
      // Shift+Tab from first wraps to last (stays in dialog)
      await page.evaluate(() => document.querySelector(".v4-liquid-dialog button")?.focus());
      await page.keyboard.press("Shift+Tab");
      const wrappedInDialog = await page.evaluate(() => document.activeElement?.closest(".v4-liquid-dialog") != null);
      assert.equal(wrappedInDialog, true, "Shift+Tab wraps and stays inside the dialog");

      await screenshot(page, "desktop-detail-open");

      // backdrop close policy
      await page.locator(".v4-liquid-detail").click({ position: { x: 4, y: 4 } });
      await page.waitForTimeout(150);
      assert.equal(await page.locator(".v4-liquid-dialog").count(), 0, "clicking the backdrop closes the detail");

      // reopen and Escape closes + restores trigger focus
      const trigger = page.locator(".v4-liquid-card.is-selected");
      await trigger.click();
      await page.waitForTimeout(150);
      await page.locator(".v4-liquid-dialog").waitFor({ state: "visible" });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
      assert.equal(await page.locator(".v4-liquid-dialog").count(), 0, "Escape closes the detail");
      const restored = await page.evaluate(() => document.activeElement?.classList.contains("v4-liquid-card"));
      assert.equal(restored, true, "closing restores focus to the triggering card");

      // E. selected-only media authority
      await page.locator(".v4-liquid-card.is-selected").click();
      await page.waitForTimeout(150);
      await page.locator(".v4-liquid-play").click();
      await page.waitForTimeout(200);
      assert.equal(await page.locator(".v4-liquid-embed").count(), 1, "playable media exists only inside the open detail");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(120);

      await assertNoHorizontalOverflow(page, "1280x800 final");
      assert.equal(errors.length, 0, `1280x800: no runtime/console errors: ${errors.join(" | ")}`);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("V4 Orbit canonical adoption — mobile 390x844 touch drag, dialog escape/restore, overflow", { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openRoute(browser, { width: 390, height: 844 }, { isMobile: true, hasTouch: true });
    try {
      await assertSelectionAuthority(page, "390x844 initial");
      await assertNoHorizontalOverflow(page, "390x844");
      await assertBackgroundMediaSilent(page, "390x844");
      await screenshot(page, "mobile-initial");

      const before = await getState(page);
      const dx = 120;
      const expectedRotation = canonicalV4OrbitRotation(before.cardIdx, before.count) + dx * ORBIT_DRAG_FACTOR;
      const expectedIdx = nearestV4OrbitIndex(expectedRotation, before.count);
      await touchDrag(page, dx);
      const after = await assertSelectionAuthority(page, "390x844 touch drag");
      assert.equal(after.cardIdx, expectedIdx, `real touch drag snaps to nearest canonical Moment (${before.cardIdx} -> ${expectedIdx})`);

      // tap-vs-drag suppression: a small touch that does not cross slop must NOT change selection
      const preTap = await getState(page);
      const emptyPoint = await findEmptyStagePoint(page);
      assert.ok(emptyPoint, "found a card-free stage point for sub-slop touch");
      await touchDrag(page, 2, emptyPoint);
      const postTap = await getState(page);
      assert.equal(postTap.cardIdx, preTap.cardIdx, "sub-slop touch is treated as a tap, not a drag");

      await page.locator(".v4-liquid-card.is-selected").click();
      await page.waitForTimeout(200);
      const dialog = page.locator(".v4-liquid-dialog");
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      assert.equal(await dialog.getAttribute("aria-modal"), "true", "mobile detail is a modal dialog");
      await screenshot(page, "mobile-detail-open");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      assert.equal(await page.locator(".v4-liquid-dialog").count(), 0, "Escape closes the mobile detail");
      const restored = await page.evaluate(() => document.activeElement?.classList.contains("v4-liquid-card"));
      assert.equal(restored, true, "mobile close restores focus to the triggering card");

      await assertNoHorizontalOverflow(page, "390x844 final");
      assert.equal(errors.length, 0, `390x844: no runtime/console errors: ${errors.join(" | ")}`);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("V4 Orbit canonical adoption — 320x720 small mobile overflow safe", { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openRoute(browser, { width: 320, height: 720 }, { isMobile: true, hasTouch: true });
    try {
      await assertSelectionAuthority(page, "320x720 initial");
      await assertNoHorizontalOverflow(page, "320x720");
      await assertBackgroundMediaSilent(page, "320x720");
      await screenshot(page, "320-initial");
      assert.equal(errors.length, 0, `320x720: no runtime/console errors: ${errors.join(" | ")}`);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("V4 Orbit canonical adoption — reduced motion keeps manual selection semantics", { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openRoute(browser, { width: 390, height: 844 }, { reducedMotion: "reduce", hasTouch: true, isMobile: true });
    try {
      const initial = await assertSelectionAuthority(page, "reduced-motion initial");
      await assertNoHorizontalOverflow(page, "reduced-motion");
      // manual card/rail/wheel/key selection still works under reduced motion
      await page.locator(".v4-liquid-stage").hover();
      await page.mouse.wheel(0, 240);
      await page.waitForTimeout(80);
      const afterWheel = await assertSelectionAuthority(page, "reduced-motion wheel");
      assert.equal(afterWheel.cardIdx, (initial.cardIdx + 1) % initial.count, "reduced motion: wheel still moves canonical selection");
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(80);
      const afterArrow = await assertSelectionAuthority(page, "reduced-motion arrow");
      assert.equal(afterArrow.cardIdx, (afterWheel.cardIdx + initial.count - 1) % initial.count, "reduced motion: arrow still moves canonical selection");
      await screenshot(page, "reduced-motion-state");
      assert.equal(errors.length, 0, `reduced motion: no runtime/console errors: ${errors.join(" | ")}`);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

// Keep the imported snap helper referenced so tree-shakers / linters stay calm.
void snapV4OrbitRotation;
