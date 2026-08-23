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
    const cardOf = (el) => (el?.hasAttribute?.("data-moment-id") ? el : el?.closest?.("[data-moment-id]") ?? null);
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      if (rect.width < 12 || rect.height < 12) continue;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue;
      const hit = cardOf(document.elementFromPoint(cx, cy));
      if (hit && hit === card) return { x: Math.round(cx), y: Math.round(cy), id: card.getAttribute("data-moment-id") };
    }
    const step = 16;
    for (let y = 24; y < window.innerHeight; y += step) {
      for (let x = 24; x < window.innerWidth; x += step) {
        const hit = cardOf(document.elementFromPoint(x, y));
        if (hit) return { x, y, id: hit.getAttribute("data-moment-id") };
      }
    }
    return null;
  });
}

// The ambient orbit moves cards continuously; at narrow viewports (320x720) a card
// is only hittable while it is near the front. Poll until one is genuinely tappable
// rather than snapshotting a stale point.
async function waitForFrontCard(page, label, timeout = 12000) {
  const start = Date.now();
  for (;;) {
    const point = await frontCardCenter(page);
    if (point) return point;
    if (Date.now() - start > timeout) break;
    await page.waitForTimeout(200);
  }
  throw new Error(`${label}: no hittable Moment card appeared within ${timeout}ms`);
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

async function focusInside(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return !!dialog && dialog.contains(document.activeElement);
  });
}

// The reduced-motion flag is applied by the component's matchMedia effect after
// first paint; poll instead of asserting immediately (CI can reach the selector
// before the effect runs).
async function waitForReducedMotionFlag(page, label) {
  try {
    await page.waitForFunction(
      () => document.querySelector('[data-rendering="css3d-dom"]')?.getAttribute("data-reduced-motion") === "reduce",
      { timeout: 8000 },
    );
  } catch {
    throw new Error(`${label}: reduced-motion flag never applied (data-reduced-motion stays "no-preference")`);
  }
}

// The Viewer moves focus into the dialog on open via rAF; poll briefly so the
// assertion does not race the focus entry (especially on touch/mobile where the
// open happens right after a synthesized click).
async function waitForFocusInside(page, label, timeout = 3000) {
  const start = Date.now();
  for (;;) {
    if (await focusInside(page)) return;
    if (Date.now() - start > timeout) break;
    // Poll interval inside a bounded polling loop — intentionally NOT a fixed
    // completion sleep (#417 classification: poll-interval window).
    await page.waitForTimeout(50);
  }
  assert.ok(await focusInside(page), `${label}: Viewer initial focus is inside the dialog`);
}

// #417: bounded condition wait for transition/readiness waits that have a
// concrete semantic observable. Explicit timeout, explicit polling, and a
// self-classifying diagnostic naming the exact unmet observable.
const CONDITION_WAIT_TIMEOUT_MS = 10000;
const CONDITION_WAIT_POLLING_MS = 50;

async function waitForPageCondition(page, description, predicate, predicateArg) {
  try {
    await page.waitForFunction(predicate, predicateArg, {
      timeout: CONDITION_WAIT_TIMEOUT_MS,
      polling: CONDITION_WAIT_POLLING_MS,
    });
  } catch (error) {
    throw new Error(
      `CONDITION_WAIT_TIMEOUT after ${CONDITION_WAIT_TIMEOUT_MS}ms: ${description}`,
      { cause: error },
    );
  }
}

// #417: wait until the world rotateY angle differs from `beforeAngle`, i.e. the
// RAF loop has applied the dispatched wheel/drag/touch input to the camera.
async function waitForWorldAngleChange(page, beforeAngle, label, actionDescription) {
  await waitForPageCondition(
    page,
    `${label}: world rotateY angle must change away from ${beforeAngle}deg after ${actionDescription} (RAF camera update never observed)`,
    (prev) => {
      const match = /rotateY\(([-0-9.]+)deg\)/.exec(
        document.querySelector('[data-rendering="css3d-dom"]')?.style.transform || "",
      );
      const angle = match ? parseFloat(match[1]) : null;
      return angle !== null && angle !== prev;
    },
    beforeAngle,
  );
}

async function assertViewerFocusTrap(page, label) {
  await waitForFocusInside(page, label);
  const wrap = () =>
    page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      const focusables = dlg?.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
      const first = focusables && focusables[0];
      const last = focusables && focusables[focusables.length - 1];
      const a = document.activeElement;
      return {
        inside: !!dlg && dlg.contains(a),
        isFirst: a === first,
        isLast: a === last,
        firstText: first?.textContent?.trim() ?? null,
        lastText: last?.textContent?.trim() ?? null,
      };
    });

  // Initial focus is inside the dialog on the first control (close button).
  let s = await wrap();
  assert.ok(s.inside, `${label}: Viewer initial focus is inside the dialog`);
  assert.ok(s.isFirst, `${label}: Viewer initial focus is on the first control (${s.firstText})`);

  // Shift+Tab from the FIRST focusable wraps to the LAST.
  await page.keyboard.press("Shift+Tab");
  s = await wrap();
  assert.ok(s.inside, `${label}: Shift+Tab stays inside the Viewer`);
  assert.ok(s.isLast, `${label}: Shift+Tab from first wraps to last (${s.lastText})`);

  // Tab from the LAST focusable wraps to the FIRST.
  await page.keyboard.press("Tab");
  s = await wrap();
  assert.ok(s.inside, `${label}: Tab stays inside the Viewer`);
  assert.ok(s.isFirst, `${label}: Tab from last wraps to first (${s.firstText})`);

  // A forward/backward pass keeps focus inside at every step.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  assert.ok((await wrap()).inside, `${label}: forward Tab pass keeps focus inside`);
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  assert.ok((await wrap()).inside, `${label}: backward Shift+Tab pass keeps focus inside`);

  await assertBackgroundInert(page, label);
}

async function assertBackgroundInert(page, label) {
  const state = await page.evaluate(() => {
    const bg = document.querySelector('[data-background]');
    const world = document.querySelector('[data-rendering="css3d-dom"]');
    const toggle = document.querySelector('[aria-expanded]');
    const card = document.querySelector('[data-moment-id]');
    const insideBg = (el) => !!el && !!bg && (el === bg || bg.contains(el));
    // Behavioral inertness: focusing an inert descendant must be a no-op.
    toggle?.focus();
    const toggleFocusable = document.activeElement === toggle;
    card?.focus();
    const cardFocusable = document.activeElement === card;
    // Restore focus to the dialog close control for the subsequent Escape step.
    document.querySelector('[role="dialog"] [aria-label="닫기"]')?.focus();
    return {
      bgInert: bg ? bg.inert : null,
      worldInsideBg: insideBg(world),
      toggleInsideBg: insideBg(toggle),
      toggleFocusable,
      cardFocusable,
    };
  });
  assert.equal(state.bgInert, true, `${label}: whole background root is inert while Viewer is open`);
  assert.equal(state.worldInsideBg, true, `${label}: world (orbit cards) is under the inert background root`);
  assert.equal(state.toggleInsideBg, true, `${label}: semantic list toggle is under the inert background root`);
  assert.equal(state.toggleFocusable, false, `${label}: semantic toggle cannot receive focus while Viewer is open`);
  assert.equal(state.cardFocusable, false, `${label}: orbit cards cannot receive focus while Viewer is open`);
}

async function closeViewer(page) {
  const dialog = page.getByRole("dialog");
  // The Viewer moves focus into the dialog on open (close control) via rAF, but
  // that focus entry may not have settled when we act immediately after open.
  // Ensure focus is inside the dialog so its Escape keydown handler receives the
  // key (otherwise the keydown lands on a detached/body element and is ignored).
  const focused = await dialog.evaluate((d) => d.contains(document.activeElement));
  if (!focused) {
    await dialog.getByRole("button", { name: "닫기" }).focus();
  }
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached", timeout: 5000 });
}

async function assertDragDoesNotOpenViewer(page, label, center) {
  const startAngle = await worldAngle(page);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x - 70, center.y, { steps: 10 });
  await page.mouse.up();
  // #417: negative-observation window. The pointer pipeline needs a settle
  // interval after mouse-up to resolve gesture-vs-click before the absence
  // assertion is meaningful; the full window is preserved and the absence
  // check now fails with a self-classifying diagnostic instead of silently
  // sampling at an arbitrary moment.
  await page.waitForTimeout(150);
  assert.equal(await page.getByRole("dialog").count(), 0, `${label}: drag above threshold does NOT open Viewer (checked after 150ms arbitration settle window)`);
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

async function touchTap(client, x, y, holdMs = 60) {
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  // A real tap has a non-zero hold; an instantaneous start/end CDP pair can be
  // dropped as a tap (no synthesized pointerup/click), which is the source of
  // intermittent "tap did not open" flakes.
  // #417 classification: genuine input-pacing hold modelling real touchscreen
  // semantics — NOT a completion wait; preserved deliberately.
  await new Promise((resolve) => setTimeout(resolve, holdMs));
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
    // #417: the 650ms sampling window is the ambient-motion temporal contract —
    // the idle RAF loop must produce a meaningful (> 1deg) rotation across it.
    // The full window is preserved; the sampled delta assertion now carries a
    // self-classifying diagnostic naming the window and the measured delta.
    const ambient0 = await worldAngle(desktop.page);
    await desktop.page.waitForTimeout(650);
    const ambient1 = await worldAngle(desktop.page);
    if (ambient1 === null || ambient0 === null) {
      throw new Error(`1280x800: AMBIENT_WINDOW_CHECK_FAILED after 650ms window: world angle unreadable (rotateY missing from css3d transform)`);
    }
    assert.notEqual(ambient0, ambient1, "1280x800: untouched normal mode auto-orbits (ambient angle changed)");
    assert.ok(Math.abs(ambient1 - ambient0) > 1, `1280x800: ambient orbit delta is meaningful after the 650ms ambient window (${(ambient1 - ambient0).toFixed(2)}deg)`);

    const center = await waitForFrontCard(desktop.page, "1280x800");
    const openedId = await openViewerFromCard(desktop.page, center);
    await assertViewerFocusTrap(desktop.page, "1280x800");
    await closeViewer(desktop.page);
    const card = desktop.page.locator(`[data-moment-id="${openedId}"]`);
    assert.equal(await card.evaluate((node) => document.activeElement === node), true, "1280x800: Escape restores focus to the originating card");

    // B-style arbitration on real desktop pointer: drag does not open Viewer.
    const dragCenter = await waitForFrontCard(desktop.page, "1280x800 drag");
    await assertDragDoesNotOpenViewer(desktop.page, "1280x800", dragCenter);

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
    await waitForReducedMotionFlag(desktopRM.page, "reduced-motion");

    // D. reduced-motion idle: NO auto-orbit.
    // #417: the 650ms window is a negative temporal contract — under
    // reduced motion the idle world must NOT move across it. The full window
    // is preserved; failure carries a self-classifying diagnostic.
    const idle0 = await worldAngle(desktopRM.page);
    await desktopRM.page.waitForTimeout(650);
    const idle1 = await worldAngle(desktopRM.page);
    if (idle1 === null || idle0 === null) {
      throw new Error(`reduced-motion: NEGATIVE_WINDOW_CHECK_FAILED after 650ms window: world angle unreadable (rotateY missing from css3d transform)`);
    }
    assert.equal(idle0, idle1, `reduced-motion: idle world angle is unchanged across the 650ms negative-observation window (${idle0}deg)`);

    // C. real wheel input changes world/camera geometry. Dispatch real wheel
    // events (deltaY) to the orbit surface; the measured rotateY change proves the
    // handler applies wheel input to the camera. Deterministic (CDP wheel can
    // no-op depending on cursor hit-testing in headless).
    await waitForFrontCard(desktopRM.page, "reduced-motion desktop");
    const beforeWheel = await worldAngle(desktopRM.page);
    await desktopRM.page.dispatchEvent('[data-rendering="css3d-dom"]', "wheel", { deltaY: 160 });
    await desktopRM.page.dispatchEvent('[data-rendering="css3d-dom"]', "wheel", { deltaY: 160 });
    // #417: completion wait — the RAF loop applies the wheel delta to rotateY;
    // wait for that observable instead of a fixed 80ms sleep.
    await waitForWorldAngleChange(desktopRM.page, beforeWheel, "reduced-motion desktop", "wheel input");
    const afterWheel = await worldAngle(desktopRM.page);
    assert.ok(
      Math.abs(afterWheel - beforeWheel) > 1,
      `reduced-motion: desktop wheel changes world geometry (${beforeWheel} -> ${afterWheel})`,
    );

    // D. manual drag still changes the world under reduced motion.
    const dragCenter = await waitForFrontCard(desktopRM.page, "reduced-motion desktop drag");
    const beforeDrag = await worldAngle(desktopRM.page);
    await desktopRM.page.mouse.move(dragCenter.x, dragCenter.y);
    await desktopRM.page.mouse.down();
    await desktopRM.page.mouse.move(dragCenter.x - 70, dragCenter.y, { steps: 10 });
    await desktopRM.page.mouse.up();
    // #417: completion wait — the RAF loop applies the drag delta to rotateY;
    // wait for that observable instead of a fixed 60ms sleep.
    await waitForWorldAngleChange(desktopRM.page, beforeDrag, "reduced-motion desktop", "manual pointer drag");
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

      // B. short real touch tap OPENS the Viewer.
      const center = await waitForFrontCard(mobile.page, spec.label);
      await touchTap(client, center.x, center.y);
      const dialog = mobile.page.getByRole("dialog");
      await dialog.waitFor({ timeout: 8000 });
      const selectedId = await mobile.page.locator("[data-selected-moment-id]").getAttribute("data-selected-moment-id");
      assert.ok(selectedId?.startsWith("moment-"), `${spec.label}: real touch tap opens Viewer (${selectedId})`);

      // E. focus contained inside the Viewer on open + whole background inert.
      await waitForFocusInside(mobile.page, spec.label);
      await assertBackgroundInert(mobile.page, spec.label);

      await closeViewer(mobile.page);
      const card = mobile.page.locator(`[data-moment-id="${selectedId}"]`);
      assert.equal(await card.evaluate((node) => document.activeElement === node), true, `${spec.label}: Escape restores focus to the tapped card`);

      // B. real touch swipe above threshold does NOT open the Viewer.
      const swipeCenter = await waitForFrontCard(mobile.page, `${spec.label} swipe`);
      const vw = mobile.page.viewportSize()?.width ?? 390;
      await touchSwipe(client, swipeCenter.x, swipeCenter.y, swipeTargetX(swipeCenter.x, vw), swipeCenter.y);
      // #417: negative-observation window after touch gesture — the pointer
      // pipeline needs a settle interval to resolve swipe-vs-tap before the
      // absence assertion is meaningful; window preserved with a
      // self-classifying diagnostic message.
      await mobile.page.waitForTimeout(150);
      assert.equal(await mobile.page.getByRole("dialog").count(), 0, `${spec.label}: real touch swipe does NOT open Viewer (checked after 150ms arbitration settle window)`);

      // pointercancel must clear pending ownership — never open.
      const cancelCenter = await waitForFrontCard(mobile.page, `${spec.label} cancel`);
      await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cancelCenter.x, y: cancelCenter.y }] });
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cancelCenter.x + 30, y: cancelCenter.y }] });
      await client.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
      // #417: negative-observation window after pointercancel (same rationale).
      await mobile.page.waitForTimeout(150);
      assert.equal(await mobile.page.getByRole("dialog").count(), 0, `${spec.label}: pointercancel clears pending — no accidental Viewer (checked after 150ms settle window)`);

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
    await waitForReducedMotionFlag(reduced.page, "reduced-motion mobile");

    // D. reduced-motion idle: NO auto-orbit.
    // #417: 650ms negative temporal contract — full window preserved with a
    // self-classifying diagnostic on failure.
    const idle0 = await worldAngle(reduced.page);
    await reduced.page.waitForTimeout(650);
    const idle1 = await worldAngle(reduced.page);
    if (idle1 === null || idle0 === null) {
      throw new Error(`reduced-motion mobile: NEGATIVE_WINDOW_CHECK_FAILED after 650ms window: world angle unreadable (rotateY missing from css3d transform)`);
    }
    assert.equal(idle0, idle1, `reduced-motion mobile: idle world angle is unchanged across the 650ms negative-observation window (${idle0}deg)`);

    // B/D. real touch swipe changes the world angle (manual ownership, isolated).
    const swipeStart = await waitForFrontCard(reduced.page, "reduced-motion mobile swipe");
    const rvw = reduced.page.viewportSize()?.width ?? 390;
    const targetX = swipeTargetX(swipeStart.x, rvw);
    const beforeSwipe = await worldAngle(reduced.page);
    await touchSwipe(rClient, swipeStart.x, swipeStart.y, targetX, swipeStart.y);
    // #417: completion wait — RAF applies the swipe delta to rotateY; wait for
    // that observable instead of a fixed 80ms sleep.
    await waitForWorldAngleChange(reduced.page, beforeSwipe, "reduced-motion mobile", "real touch swipe");
    const afterSwipe = await worldAngle(reduced.page);
    const delta1 = afterSwipe - beforeSwipe;
    assert.notEqual(beforeSwipe, afterSwipe, `reduced-motion mobile: real touch swipe rotates world (${beforeSwipe} -> ${afterSwipe})`);

    // B. immediate reverse is possible. The world rotated during swipe 1, so
    // recompute a fresh hittable card for the reverse swipe, and reverse the
    // first swipe's horizontal direction.
    const reverseStart = await waitForFrontCard(reduced.page, "reduced-motion mobile reverse");
    const firstDir = targetX - swipeStart.x;
    const reverseTargetX = Math.max(10, Math.min(rvw - 10, reverseStart.x - firstDir));
    await touchSwipe(rClient, reverseStart.x, reverseStart.y, reverseTargetX, reverseStart.y);
    // #417: completion wait — RAF applies the reverse swipe delta; wait for the
    // observable instead of a fixed 80ms sleep.
    await waitForWorldAngleChange(reduced.page, afterSwipe, "reduced-motion mobile", "reverse touch swipe");
    const afterReverse = await worldAngle(reduced.page);
    const delta2 = afterReverse - afterSwipe;
    assert.notEqual(delta1, 0, "reduced-motion mobile: first swipe produced a delta");
    assert.ok(Math.sign(delta1) !== Math.sign(delta2), `reduced-motion mobile: reverse swipe reverses rotation (${delta1.toFixed(2)} -> ${delta2.toFixed(2)})`);

    // D. manual real touch tap still opens the Viewer under reduced motion.
    const tapCenter = await waitForFrontCard(reduced.page, "reduced-motion mobile tap");
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
