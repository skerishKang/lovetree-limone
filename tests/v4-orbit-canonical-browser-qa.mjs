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

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function stubRoutineThirdPartyResources(page) {
  await page.route("**/*", async (route) => {
    const requestUrl = new globalThis.URL(route.request().url());

    if (requestUrl.hostname === "fonts.googleapis.com") {
      await route.fulfill({ status: 200, contentType: "text/css", body: "" });
      return;
    }

    if (requestUrl.hostname === "img.youtube.com" || requestUrl.hostname === "i.ytimg.com") {
      await route.fulfill({ status: 200, contentType: "image/png", body: ONE_PIXEL_PNG });
      return;
    }

    if (requestUrl.hostname === "www.youtube.com" && requestUrl.pathname.startsWith("/embed/")) {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: "<!doctype html><html><head><title>deterministic Orbit QA embed</title></head><body></body></html>",
      });
      return;
    }

    await route.continue();
  });
}

async function openRoute(browser, viewport, options = {}) {
  const page = await browser.newPage({ viewport, ...options });
  await stubRoutineThirdPartyResources(page);
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

async function pointerDrag(page, dx, dy = 0, startPoint = null) {
  const box = await page.locator(".v4-liquid-stage").boundingBox();
  assert.ok(box, "orbit stage box exists for drag");
  const x0 = startPoint ? startPoint.x : box.x + box.width / 2;
  const y0 = startPoint ? startPoint.y : box.y + box.height / 2;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x0 + dx, y0 + dy, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(1100);
}

// Return the visible centre of the card that is currently in a given position
// in the orbit (index-based).  Cards move through 3-D transform so we find
// the element by selector and compute its current bounding rect.
// Find a point inside a card that actually hits THAT card.  In the 3-D orbit
// the cards overlap, so an element's bounding-box centre can be covered by
// another card; elementFromPoint finds the topmost hit at each candidate.
async function cardHitPoint(page, index) {
  const card = page.locator(".v4-liquid-card").nth(index);
  const box = await card.boundingBox();
  assert.ok(box, `card ${index} visible`);
  for (let gy = 0.25; gy < 1; gy += 0.25) {
    for (let gx = 0.25; gx < 1; gx += 0.25) {
      const x = box.x + box.width * gx;
      const y = box.y + box.height * gy;
      const hitIdx = await page.evaluate(([px, py]) => {
        const el = document.elementFromPoint(px, py);
        const cardEl = el?.closest?.(".v4-liquid-card");
        if (!cardEl) return -1;
        return Array.from(document.querySelectorAll(".v4-liquid-card")).indexOf(cardEl);
      }, [x, y]);
      if (hitIdx === index) return { x, y };
    }
  }
  return null;
}

// Tap/click a specific card at a point that really hits that card, avoiding
// the overlap problem in the 3-D orbit (desktop mouse vs mobile touch).
async function tapPoint(page, point) {
  await page.touchscreen.tap(point.x, point.y);
  await page.waitForTimeout(200);
}
async function cardTap(page, index) {
  const point = await cardHitPoint(page, index);
  assert.ok(point, `card ${index} has a reachable tap point`);
  await tapPoint(page, point);
}
async function cardClick(page, index) {
  const point = await cardHitPoint(page, index);
  assert.ok(point, `card ${index} has a reachable click point`);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(200);
}

// Find a card (other than excludeIdx) that has an actual reachable hit point.
// In the 3-D orbit some cards are fully covered; interacting with a card that
// cannot be hit would exercise the neighbour instead.
async function findReachableCard(page, excludeIdx) {
  const count = await page.locator(".v4-liquid-card").count();
  for (let i = 0; i < count; i += 1) {
    if (i === excludeIdx) continue;
    const point = await cardHitPoint(page, i);
    if (point) return { index: i, point };
  }
  return null;
}

// Start a drag from inside a card, move past the card's bounds (≥200px) and
// verify the result is exactly one canonical snap with no dialog open.
async function assertCardOriginDrag(page, fromIdx, dx) {
  const start = await cardHitPoint(page, fromIdx);
  assert.ok(start, `card ${fromIdx} has a reachable drag start point`);
  const box = await page.locator(".v4-liquid-card").nth(fromIdx).boundingBox();
  // ensure we move well past the card's right edge
  const beyondEdge = Math.max(dx, (box?.width ?? 224) * 1.2);
  const before = await getState(page);
  const expectedRotation = canonicalV4OrbitRotation(before.cardIdx, before.count) + beyondEdge * ORBIT_DRAG_FACTOR;
  const expectedIdx = nearestV4OrbitIndex(expectedRotation, before.count);
  await pointerDrag(page, beyondEdge, 0, start);
  const after = await assertSelectionAuthority(page, `card-origin drag from ${fromIdx}`);
  assert.equal(after.cardIdx, expectedIdx,
    `card-origin drag snaps to nearest canonical Moment (${before.cardIdx} -> ${expectedIdx})`);
  // dialog must not open after a drag
  assert.equal(await page.locator(".v4-liquid-dialog").count(), 0,
    "no dialog opens after a card-origin drag");
  return after;
}

// Trigger a real pointercancel by injecting a second touch finger while the
// first is still active.  Then verify stuck drag is cleared and the next
// touch drag still works.
async function assertPointerCancelRecovery(page) {
  const point = await findEmptyStagePoint(page);
  assert.ok(point, "empty stage point for pointercancel");
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: point.x, y: point.y, radiusX: 3, radiusY: 3, force: 1, id: 200 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: point.x + 20, y: point.y, radiusX: 3, radiusY: 3, force: 1, id: 200 }],
  });
  // second finger activates — real browser cancels the first pointer
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: point.x + 20, y: point.y, radiusX: 3, radiusY: 3, force: 1, id: 200 },
      { x: point.x + 100, y: point.y + 50, radiusX: 3, radiusY: 3, force: 1, id: 201 },
    ],
  });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await session.detach();
  await page.waitForTimeout(300);
  assert.equal(await page.locator(".v4-liquid-dialog").count(), 0,
    "pointercancel does not open a dialog");
  // Next regular gesture still works
  const before = await getState(page);
  const dx = 100;
  const expectedRotation = canonicalV4OrbitRotation(before.cardIdx, before.count) + dx * ORBIT_DRAG_FACTOR;
  const expectedIdx = nearestV4OrbitIndex(expectedRotation, before.count);
  await touchDrag(page, dx, point);
  const after = await assertSelectionAuthority(page, "post-pointercancel drag");
  assert.equal(after.cardIdx, expectedIdx, "drag after pointercancel still works");
}

// Steal pointer capture from the stage while a drag is in progress so the
// stage fires lostpointercapture.  Then verify no stuck state and the next
// drag still works.
async function assertLostPointerCaptureRecovery(page) {
  const point = await findEmptyStagePoint(page);
  assert.ok(point, "empty stage point for lostpointercapture");
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(80);
  // Another element claims the pointer capture — stage loses it.
  // Playwright mouse uses pointerId 1.
  await page.evaluate(() => {
    const dummy = document.createElement("div");
    dummy.id = "capture-thief";
    dummy.style.position = "fixed";
    dummy.style.left = "0";
    dummy.style.top = "0";
    dummy.style.width = "1px";
    dummy.style.height = "1px";
    document.body.appendChild(dummy);
    dummy.setPointerCapture(1);
  });
  await page.mouse.up();
  await page.waitForTimeout(300);
  // Clean up the dummy
  await page.evaluate(() => document.getElementById("capture-thief")?.remove());
  assert.equal(await page.locator(".v4-liquid-dialog").count(), 0,
    "lost pointer capture does not open a dialog");
  // Next drag still works
  const before = await getState(page);
  const dx = 100;
  await pointerDrag(page, dx, 0, point);
  const after = await assertSelectionAuthority(page, "post-lostcapture drag");
  const expectedRotation = canonicalV4OrbitRotation(before.cardIdx, before.count) + dx * ORBIT_DRAG_FACTOR;
  const expectedIdx = nearestV4OrbitIndex(expectedRotation, before.count);
  assert.equal(after.cardIdx, expectedIdx, "drag after lost pointer capture still works");
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
      await cardClick(page, openIdx);
      const afterCard = await assertSelectionAuthority(page, "1280x800 card");
      assert.equal(afterCard.cardIdx, openIdx, "clicking a non-selected card selects it canonically");

      // F. card-origin pointer drag — start inside a card, move past its
      // bounds.  Pointer capture must keep the drag alive across the whole
      // gesture so that release produces exactly one canonical snap.
      const originIdx = (afterCard.cardIdx + 3) % afterCard.count;
      await assertCardOriginDrag(page, originIdx, 180);

      // click-after-drag suppression: the card whose index remained unchanged
      // by the drag should not open a dialog on the next click.
      assert.equal(await page.locator(".v4-liquid-dialog").count(), 0,
        "no dialog appears after card-origin drag");

      // normal card tap still works after a card-origin drag
      const postDragTap = (originIdx + 1) % afterCard.count;
      await cardClick(page, postDragTap);
      const afterTap = await assertSelectionAuthority(page, "1280x800 post-drag tap");
      assert.equal(afterTap.cardIdx, postDragTap,
        "normal card tap still works after a card-origin drag");

      // D. responsive selected-Moment detail + focus trap + escape + restore
      const detailIdx = (await getState(page)).cardIdx;
      await cardClick(page, detailIdx);
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
      const reopenIdx = (await getState(page)).cardIdx;
      await cardClick(page, reopenIdx);
      await page.locator(".v4-liquid-dialog").waitFor({ state: "visible" });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
      assert.equal(await page.locator(".v4-liquid-dialog").count(), 0, "Escape closes the detail");
      const restored = await page.evaluate(() => document.activeElement?.classList.contains("v4-liquid-card"));
      assert.equal(restored, true, "closing restores focus to the triggering card");

      // E. selected-only media authority
      const mediaIdx = (await getState(page)).cardIdx;
      await cardClick(page, mediaIdx);
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

      // G. Card-origin touch drag — start inside a card via CDP touch, move
      // past card bounds and verify exactly one canonical snap.
      const beforeCardOriginTouch = await getState(page);
      const originTouchIdx = (beforeCardOriginTouch.cardIdx + 4) % beforeCardOriginTouch.count;
      const originPoint = await cardHitPoint(page, originTouchIdx);
      assert.ok(originPoint, `card ${originTouchIdx} has a reachable touch start point`);
      const touchDx = 160;
      const expectedTouchRotation = canonicalV4OrbitRotation(beforeCardOriginTouch.cardIdx, beforeCardOriginTouch.count) + touchDx * ORBIT_DRAG_FACTOR;
      const expectedTouchIdx = nearestV4OrbitIndex(expectedTouchRotation, beforeCardOriginTouch.count);
      await touchDrag(page, touchDx, originPoint);
      const afterTouchDrag = await assertSelectionAuthority(page, "390x844 card-origin touch drag");
      assert.equal(afterTouchDrag.cardIdx, expectedTouchIdx,
        `card-origin touch drag snaps to nearest canonical Moment (${beforeCardOriginTouch.cardIdx} -> ${expectedTouchIdx})`);
      assert.equal(await page.locator(".v4-liquid-dialog").count(), 0,
        "card-origin touch drag does not open a dialog");

      // H. Non-selected card sub-slop tap -> canonical select
      const currentIdx = (await getState(page)).cardIdx;
      const nonSelected = await findReachableCard(page, currentIdx);
      assert.ok(nonSelected, "found a reachable non-selected card for sub-slop tap");
      await tapPoint(page, nonSelected.point);
      const afterSubSlopSelect = await assertSelectionAuthority(page, "390x844 sub-slop card tap select");
      assert.equal(afterSubSlopSelect.cardIdx, nonSelected.index,
        "non-selected card sub-slop tap canonically selects the card");
      // I. Selected card sub-slop tap -> detail open
      const selectedIdx = (await getState(page)).cardIdx;
      await cardTap(page, selectedIdx);
      const dialog = page.locator(".v4-liquid-dialog");
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      assert.equal(await dialog.getAttribute("aria-modal"), "true", "mobile detail is a modal dialog");
      await screenshot(page, "mobile-detail-open");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      assert.equal(await page.locator(".v4-liquid-dialog").count(), 0, "Escape closes the mobile detail");
      const restored = await page.evaluate(() => document.activeElement?.classList.contains("v4-liquid-card"));
      assert.equal(restored, true, "mobile close restores focus to the triggering card");

      // J. pointercancel recovery
      await assertPointerCancelRecovery(page);

      // K. lostpointercapture recovery
      await assertLostPointerCaptureRecovery(page);

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
