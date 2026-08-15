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

// The welcome kicker text "WELCOME BACK" also appears inside the DOMAIN BOUNDARY
// contract copy on the page, so the locator MUST be exact to avoid a Playwright
// strict-mode violation. Source-faithful: only the kicker reads exactly that.
async function assertCenterVoidAndDepth(page, label) {
  assert.ok(await page.getByText("WELCOME BACK", { exact: true }).isVisible(), `${label}: center Welcome void is readable`);
  assert.equal(await page.locator('[data-depth-tier="foreground"]').count(), 9, `${label}: 9 foreground cards`);
  assert.equal(await page.locator('[data-depth-tier="mid"]').count(), 13, `${label}: 13 mid cards`);
  assert.equal(await page.locator('[data-depth-tier="far"]').count(), 18, `${label}: 18 far cards`);
}

// Live world camera angle (rotateY deg) written by the ambient/drag/wheel RAF loop.
async function worldAngle(page) {
  return page.locator('[data-rendering="css3d-dom"]').evaluate((el) => {
    const match = /rotateY\(([-0-9.]+)deg\)/.exec(el.style.transform || "");
    return match ? parseFloat(match[1]) : null;
  });
}

// Pick a point that genuinely lands on a Moment card (so a real tap/swipe hits it).
// Prefer a card's own center; if occluded (dense 3D arrangement), scan a coarse grid
// for any point whose top element is the card or one of its children.
async function frontCardCenter(page) {
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("[data-moment-id]"));
    const isCard = (el) => !!el && (el.hasAttribute?.("data-moment-id") || !!el.closest?.("[data-moment-id]"));
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      if (rect.width < 12 || rect.height < 12) continue;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue;
      if (isCard(document.elementFromPoint(cx, cy))) return { x: Math.round(cx), y: Math.round(cy) };
    }
    const step = 16;
    for (let y = 24; y < window.innerHeight; y += step) {
      for (let x = 24; x < window.innerWidth; x += step) {
        if (isCard(document.elementFromPoint(x, y))) return { x, y };
      }
    }
    return null;
  });
}

// Horizontal swipe endpoint that stays inside the viewport.
function swipeTargetX(startX, viewportWidth, distance = 80) {
  const right = startX + distance <= viewportWidth - 10;
  return right ? startX + distance : startX - distance;
}

async function openViewerFromCard(page, center) {
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.up();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ timeout: 8000 });
  const selectedId = await page.locator("[data-selected-moment-id]").getAttribute("data-selected-moment-id");
  assert.ok(selectedId?.startsWith("moment-"), `card tap opens Viewer for a real Moment (${selectedId})`);
  return selectedId;
}

async function assertViewerFocusTrap(page, label) {
  const inside = () =>
    page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return !!dialog && dialog.contains(document.activeElement);
    });
  assert.ok(await inside(), `${label}: Viewer initial focus is inside the dialog`);
  await page.keyboard.press("Tab");
  assert.ok(await inside(), `${label}: Tab keeps focus inside the Viewer`);
  await page.keyboard.press("Tab");
  assert.ok(await inside(), `${label}: repeated Tab keeps focus inside the Viewer`);
  await page.keyboard.press("Shift+Tab");
  assert.ok(await inside(), `${label}: Shift+Tab keeps focus inside the Viewer`);
  const inert = await page.evaluate(() => {
    const world = document.querySelector('[data-rendering="css3d-dom"]');
    return world ? world.inert : null;
  });
  assert.equal(inert, true, `${label}: background world is inert while Viewer is open`);
}

async function closeViewer(page) {
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 5000 });
}

async function assertDragDoesNotOpenViewer(page, label, center) {
  const startAngle = await worldAngle(page);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x - 70, center.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  assert.equal(await page.getByRole("dialog").count(), 0, `${label}: drag above threshold does NOT open Viewer`);
  return startAngle;
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
  await closeViewer(page);
  assert.equal(await toggle.evaluate((node) => document.activeElement === node), true, `${label}: Escape restores focus to the list toggle`);
}

// ---- Real mobile touch helpers (CDP touch — genuine touchscreen input) ----
async function cdpSession(page) {
  return page.context().newCDPSession(page);
}

async function touchTap(client, x, y) {
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function touchSwipe(client, x0, y0, x1, y1, steps = 12) {
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: Math.round(x0 + (x1 - x0) * t), y: Math.round(y0 + (y1 - y0) * t) }],
    });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

const browser = await chromium.launch({ headless: true });

try {
  // ----------------------------------------------------------------------
  // Desktop 1280x800 — normal motion: ambient auto-orbit, tap opens, focus trap
  // ----------------------------------------------------------------------
  const desktop = await openRoute(browser, { width: 1280, height: 800 });
  try {
    await assertNoHorizontalOverflow(desktop.page, "1280x800");
    await assertCenterVoidAndDepth(desktop.page, "1280x800");

    // A. TRUE AMBIENT AUTO-ORBIT in normal idle mode: world angle advances on its own.
    const ambient0 = await worldAngle(desktop.page);
    await desktop.page.waitForTimeout(650);
    const ambient1 = await worldAngle(desktop.page);
    assert.notEqual(ambient0, ambient1, "1280x800: untouched normal mode auto-orbits (ambient angle changed)");
    assert.ok(Math.abs(ambient1 - ambient0) > 1, `1280x800: ambient orbit delta is meaningful (${(ambient1 - ambient0).toFixed(2)}deg)`);

    const center = await frontCardCenter(desktop.page);
    assert.ok(center, "1280x800: a hittable Moment card exists");
    const openedId = await openViewerFromCard(desktop.page, center);
    await assertViewerFocusTrap(desktop.page, "1280x800");
    await closeViewer(desktop.page);
    const card = desktop.page.locator(`[data-moment-id="${openedId}"]`);
    assert.equal(await card.evaluate((node) => document.activeElement === node), true, "1280x800: Escape restores focus to the originating card");

    // B-style arbitration on real desktop pointer: drag does not open Viewer.
    await assertDragDoesNotOpenViewer(desktop.page, "1280x800", center);

    await assertListKeyboardOpenAndClose(desktop.page, "1280x800");
    assert.deepEqual(desktop.errors, [], `1280x800: no console/page errors: ${desktop.errors.join(" | ")}`);
  } finally {
    await desktop.context.close();
  }

  // ----------------------------------------------------------------------
  // Desktop 1280x800 — reduced motion: ambient OFF, manual wheel/drag still move world
  // ----------------------------------------------------------------------
  const desktopRM = await openRoute(browser, { width: 1280, height: 800 }, { reducedMotion: "reduce" });
  try {
    assert.equal(await desktopRM.page.locator('[data-rendering="css3d-dom"]').getAttribute("data-reduced-motion"), "reduce", "reduced-motion: ambient orbit flag is set");

    // D. reduced-motion idle: NO auto-orbit.
    const idle0 = await worldAngle(desktopRM.page);
    await desktopRM.page.waitForTimeout(650);
    const idle1 = await worldAngle(desktopRM.page);
    assert.equal(idle0, idle1, `reduced-motion: idle world angle is unchanged (${idle0}deg)`);

    // C. real wheel input changes world/camera geometry.
    const wheelCenter = await frontCardCenter(desktopRM.page);
    const beforeWheel = await worldAngle(desktopRM.page);
    await desktopRM.page.mouse.move(wheelCenter.x, wheelCenter.y);
    await desktopRM.page.mouse.wheel(0, 160);
    await desktopRM.page.waitForTimeout(60);
    const afterWheel = await worldAngle(desktopRM.page);
    assert.notEqual(beforeWheel, afterWheel, `reduced-motion: desktop wheel changes world geometry (${beforeWheel} -> ${afterWheel})`);

    // D. manual drag still changes the world under reduced motion.
    const dragCenter = await frontCardCenter(desktopRM.page);
    const beforeDrag = await worldAngle(desktopRM.page);
    await desktopRM.page.mouse.move(dragCenter.x, dragCenter.y);
    await desktopRM.page.mouse.down();
    await desktopRM.page.mouse.move(dragCenter.x - 70, dragCenter.y, { steps: 10 });
    await desktopRM.page.mouse.up();
    await desktopRM.page.waitForTimeout(60);
    const afterDrag = await worldAngle(desktopRM.page);
    assert.notEqual(beforeDrag, afterDrag, `reduced-motion: manual drag still rotates world (${beforeDrag} -> ${afterDrag})`);

    assert.deepEqual(desktopRM.errors, [], `reduced-motion desktop: no console/page errors: ${desktopRM.errors.join(" | ")}`);
  } finally {
    await desktopRM.context.close();
  }

  // ----------------------------------------------------------------------
  // Mobile 390x844 and 320x720 — normal motion: REAL touch tap/swipe arbitration
  // ----------------------------------------------------------------------
  for (const spec of [
    { label: "390x844", viewport: { width: 390, height: 844 } },
    { label: "320x720", viewport: { width: 320, height: 720 } },
  ]) {
    const mobile = await openRoute(browser, spec.viewport, { isMobile: true, hasTouch: true });
    const client = await cdpSession(mobile.page);
    try {
      await assertNoHorizontalOverflow(mobile.page, spec.label);
      await assertCenterVoidAndDepth(mobile.page, spec.label);

      const center = await frontCardCenter(mobile.page);
      assert.ok(center, `${spec.label}: a hittable Moment card exists`);

      // B. short real touch tap OPENS the Viewer.
      await touchTap(client, center.x, center.y);
      const dialog = mobile.page.getByRole("dialog");
      await dialog.waitFor({ timeout: 8000 });
      const selectedId = await mobile.page.locator("[data-selected-moment-id]").getAttribute("data-selected-moment-id");
      assert.ok(selectedId?.startsWith("moment-"), `${spec.label}: real touch tap opens Viewer (${selectedId})`);

      // E. focus contained inside the Viewer on open.
      const inside = await mobile.page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]');
        return !!dlg && dlg.contains(document.activeElement);
      });
      assert.ok(inside, `${spec.label}: Viewer open keeps focus inside the dialog`);

      await closeViewer(mobile.page);
      const card = mobile.page.locator(`[data-moment-id="${selectedId}"]`);
      assert.equal(await card.evaluate((node) => document.activeElement === node), true, `${spec.label}: Escape restores focus to the tapped card`);

      // B. real touch swipe above threshold does NOT open the Viewer.
      const swipeCenter = await frontCardCenter(mobile.page);
      const vw = mobile.page.viewportSize()?.width ?? 390;
      await touchSwipe(client, swipeCenter.x, swipeCenter.y, swipeTargetX(swipeCenter.x, vw), swipeCenter.y);
      await mobile.page.waitForTimeout(150);
      assert.equal(await mobile.page.getByRole("dialog").count(), 0, `${spec.label}: real touch swipe does NOT open Viewer`);

      // pointercancel must clear pending ownership — never open.
      const cancelCenter = await frontCardCenter(mobile.page);
      await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cancelCenter.x, y: cancelCenter.y }] });
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cancelCenter.x + 30, y: cancelCenter.y }] });
      await client.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
      await mobile.page.waitForTimeout(150);
      assert.equal(await mobile.page.getByRole("dialog").count(), 0, `${spec.label}: pointercancel clears pending — no accidental Viewer`);

      assert.deepEqual(mobile.errors, [], `${spec.label}: no console/page errors: ${mobile.errors.join(" | ")}`);
    } finally {
      await mobile.context.close();
    }
  }

  // ----------------------------------------------------------------------
  // Mobile 390x844 — reduced motion: ambient OFF, manual swipe still rotates world
  // (clean proof of swipe ownership, isolated from ambient), immediate reverse.
  // ----------------------------------------------------------------------
  const reduced = await openRoute(browser, { width: 390, height: 844 }, { reducedMotion: "reduce", isMobile: true, hasTouch: true });
  const rClient = await cdpSession(reduced.page);
  try {
    assert.equal(await reduced.page.locator('[data-rendering="css3d-dom"]').getAttribute("data-reduced-motion"), "reduce", "reduced-motion mobile: ambient orbit flag is set");

    // D. reduced-motion idle: NO auto-orbit.
    const idle0 = await worldAngle(reduced.page);
    await reduced.page.waitForTimeout(650);
    const idle1 = await worldAngle(reduced.page);
    assert.equal(idle0, idle1, `reduced-motion mobile: idle world angle is unchanged (${idle0}deg)`);

    // B/D. real touch swipe changes the world angle (manual ownership, isolated).
    const swipeCenter = await frontCardCenter(reduced.page);
    const rvw = reduced.page.viewportSize()?.width ?? 390;
    const targetX = swipeTargetX(swipeCenter.x, rvw);
    const beforeSwipe = await worldAngle(reduced.page);
    await touchSwipe(rClient, swipeCenter.x, swipeCenter.y, targetX, swipeCenter.y);
    await reduced.page.waitForTimeout(80);
    const afterSwipe = await worldAngle(reduced.page);
    const delta1 = afterSwipe - beforeSwipe;
    assert.notEqual(beforeSwipe, afterSwipe, `reduced-motion mobile: real touch swipe rotates world (${beforeSwipe} -> ${afterSwipe})`);

    // B. immediate reverse is possible.
    await touchSwipe(rClient, swipeCenter.x, swipeCenter.y, swipeCenter.x - (targetX - swipeCenter.x), swipeCenter.y);
    await reduced.page.waitForTimeout(80);
    const afterReverse = await worldAngle(reduced.page);
    const delta2 = afterReverse - afterSwipe;
    assert.notEqual(delta1, 0, "reduced-motion mobile: first swipe produced a delta");
    assert.ok(Math.sign(delta1) !== Math.sign(delta2), `reduced-motion mobile: reverse swipe reverses rotation (${delta1.toFixed(2)} -> ${delta2.toFixed(2)})`);

    // D. manual real touch tap still opens the Viewer under reduced motion.
    const tapCenter = await frontCardCenter(reduced.page);
    await touchTap(rClient, tapCenter.x, tapCenter.y);
    const rDialog = reduced.page.getByRole("dialog");
    await rDialog.waitFor({ timeout: 8000 });
    assert.ok(
      (await reduced.page.locator("[data-selected-moment-id]").getAttribute("data-selected-moment-id"))?.startsWith("moment-"),
      "reduced-motion mobile: real touch tap still opens Viewer",
    );
    await closeViewer(reduced.page);

    // D. semantic list keyboard operation works under reduced motion.
    await assertListKeyboardOpenAndClose(reduced.page, "reduced-motion mobile");

    assert.deepEqual(reduced.errors, [], `reduced-motion mobile: no console/page errors: ${reduced.errors.join(" | ")}`);
  } finally {
    await reduced.context.close();
  }

  console.log("LINEAGE_64_ROUTE_BROWSER_QA_PASS");
} finally {
  await browser.close();
}
