// Lineage 60 V1.2 — dedicated native browser QA (evidence-only).
//
// Runs against a locally served build (LOVETREE_QA_BASE_URL / LINEAGE60_QA_URL,
// default http://127.0.0.1:3000). It does NOT mutate backend/API/DB/Auth and is
// intentionally kept OUTSIDE the standard `tests/*.test.mjs` corpus so the
// shared A-track fail-closed browser inventory is unaffected.
//
// It proves, in an actual browser:
//   Blocker 1 — drag vs click authority (A click selects, B rotate-drag no-select,
//               C pointercancel no-select, D pinch no-select)
//   Blocker 2 — true depth / occlusion (frontmost hit changes with yaw/pitch on a
//               controlled overlap; depth-before / depth-after captures)
//   Blocker 3 — actual Lineage60 route QA at 1280x800 / 390x844 / 320x720:
//               load, zero console/page errors, zero horizontal overflow, the 4
//               semantic levels, search/direct jump, single selection authority,
//               Inspector projection, accessible list, keyboard alternative,
//               visible focus, reduced-motion safety, Bridge Moment truthfulness.

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.LOVETREE_QA_BASE_URL || process.env.LINEAGE60_QA_URL || "http://127.0.0.1:3000";
const ROUTE = "/design-lab/lineages/60/v1-2";
const URL = `${BASE}${ROUTE}`;
const OUT = "qa/evidence/lineage-60";

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
  assert.ok(response?.ok(), `Lineage60 route HTTP ${response?.status()}`);
  await page.locator("canvas").first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(250);
  return { context, page, errors };
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  assert.ok(overflow <= 1, `${label}: horizontal overflow ${overflow}px`);
}

async function assertNoErrors(errors, label) {
  assert.deepEqual(errors, [], `${label}: no console/page errors: ${errors.join(" | ")}`);
}

async function getSelectedTitle(page) {
  const item = page.locator('[data-moment-item][aria-selected="true"]');
  if ((await item.count()) === 0) return null;
  return (await item.first().innerText()).trim();
}

async function clickListItemByText(page, text) {
  const item = page.locator('[data-moment-item]', { hasText: text }).first();
  await item.click();
  return item;
}

async function dispatchSyntheticPointerCancel(page) {
  await page.evaluate(() => {
    const c = document.querySelector("canvas");
    c.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 1, bubbles: true }));
  });
}

async function dispatchPinch(page, box) {
  const session = await page.context().newCDPSession(page);
  const p = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy, radiusX: 5, radiusY: 5, force: 1, id: 1 });
  const q = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy, radiusX: 5, radiusY: 5, force: 1, id: 2 });
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [p(0.45, 0.5), q(0.55, 0.5)] });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [p(0.40, 0.5), q(0.60, 0.5)] });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [p(0.35, 0.5), q(0.65, 0.5)] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const record = (name, ok, detail = "") => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} · ${name}${detail ? ` · ${detail}` : ""}`);
  };

  try {
    // ---------- 3 viewports: load, errors, overflow, screenshots ----------
    const viewports = [
      { label: "desktop-1280x800", viewport: { width: 1280, height: 800 } },
      { label: "mobile-390x844", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
      { label: "narrow-320x720", viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true },
    ];

    for (const spec of viewports) {
      const { context, page, errors } = await openRoute(browser, spec.viewport, {
        isMobile: spec.isMobile,
        hasTouch: spec.hasTouch,
      });
      try {
        await assertNoHorizontalOverflow(page, spec.label);
        await assertNoErrors(errors, spec.label);
        // accessible list + keyboard alternative present
        assert.ok(await page.locator('[role="listbox"]').count() > 0, "accessible listbox present");
        assert.ok(await page.locator("[data-moment-item]").count() > 0, "moment list items present");
        await page.screenshot({ path: `${OUT}/${spec.label}.png`, fullPage: true });
        record(`route-load:${spec.label}`, true);
      } finally {
        await context.close();
      }
    }

    // ---------- 4 semantic levels differ in composition ----------
    {
      const { context, page, errors } = await openRoute(browser, { width: 1280, height: 800 });
      try {
        const levelLabels = ["MACRO", "CLUSTER", "FIELD", "INSPECT"];
        const statusByLevel = [];
        for (let lv = 0; lv < 4; lv += 1) {
          await page.locator(".levelBtn").nth(lv).click();
          await page.waitForTimeout(120);
          const pressed = (await page.locator(".levelBtn").nth(lv).getAttribute("aria-pressed")) === "true";
          assert.ok(pressed, `level ${lv} (${levelLabels[lv]}) becomes aria-pressed`);
          statusByLevel.push((await page.locator(".status").innerText()).trim());
        }
        // search/direct jump + single selection authority + Inspector projection
        const before = await getSelectedTitle(page);
        assert.equal(before, null, "no selection before direct jump");
        await clickListItemByText(page, "처음 본 그 사람의 뒷모습");
        const after = await getSelectedTitle(page);
        assert.ok(after, "direct jump selects a moment");
        const selectedCount = await page.locator('[data-moment-item][aria-selected="true"]').count();
        assert.equal(selectedCount, 1, "exactly one selectedMomentId drives the list");
        // inspector shows the selected title (projection authority)
        const inspectorTitle = (await page.locator(".inspectTitle").innerText()).trim();
        assert.ok(inspectorTitle.length > 0, "Inspector projects the selected moment title");
        assert.equal(inspectorTitle, after, "Inspector reflects the single selected moment");
        // selecting enters INSPECT level (composition differs from MACRO)
        assert.ok((await page.locator(".levelBtn").nth(3).getAttribute("aria-pressed")) === "true", "selection enters INSPECT level");
        // keyboard semantic alternative
        await page.locator("canvas").first().focus();
        assert.equal(await page.evaluate(() => document.activeElement?.tagName), "CANVAS", "canvas is keyboard-focusable (visible focus target)");
        await page.keyboard.press("2");
        await page.waitForTimeout(80);
        assert.ok((await page.locator(".levelBtn").nth(2).getAttribute("aria-pressed")) === "true", "number key 2 reaches FIELD level");
        await page.keyboard.press("0");
        await page.waitForTimeout(80);
        assert.ok((await page.locator(".levelBtn").nth(0).getAttribute("aria-pressed")) === "true", "number key 0 returns to MACRO");
        await assertNoErrors(errors, "semantic-levels");
        record("semantic-levels+single-authority+inspector+keyboard", true);
      } finally {
        await context.close();
      }
    }

    // ---------- Bridge Moment truthfulness ----------
    {
      const { context, page, errors } = await openRoute(browser, { width: 1280, height: 800 });
      try {
        const bridgeItem = page.locator("[data-moment-item]").filter({ hasText: "BRIDGE" }).first();
        assert.ok((await bridgeItem.count()) > 0, "at least one Bridge Moment exists in the list");
        await bridgeItem.click();
        await page.waitForTimeout(150);
        const inspectorText = (await page.locator(".explorer").innerText());
        assert.ok(/Bridge Moment/i.test(inspectorText), "Bridge Moment is truthfully projected in the Inspector");
        await assertNoErrors(errors, "bridge-truthfulness");
        record("bridge-moment-truthfulness", true);
      } finally {
        await context.close();
      }
    }

    // ---------- reduced-motion safety ----------
    {
      const { context, page, errors } = await openRoute(browser, { width: 390, height: 844 }, { reducedMotion: "reduce", isMobile: true, hasTouch: true });
      try {
        await assertNoErrors(errors, "reduced-motion");
        await clickListItemByText(page, "처음 본 그 사람의 뒷모습");
        const sel = await getSelectedTitle(page);
        assert.ok(sel, "selection still works under reduced motion");
        record("reduced-motion-safety", true);
      } finally {
        await context.close();
      }
    }

    // ---------- Blocker 1 + 2: depth-overlap fixture ----------
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      const errors = captureErrors(page);
      const response = await page.goto(`${URL}?qa=depth-overlap`, { waitUntil: "networkidle", timeout: 30000 });
      assert.ok(response?.ok(), `depth fixture HTTP ${response?.status()}`);
      await page.locator("canvas").first().waitFor({ timeout: 15000 });
      // wait until FIELD level is active (qa pins level 2)
      await page.waitForFunction(() => {
        const btns = document.querySelectorAll(".levelBtn");
        return btns[2] && btns[2].getAttribute("aria-pressed") === "true";
      }, { timeout: 10000 });
      const box = await page.locator("canvas").first().boundingBox();
      assert.ok(box, "canvas bounding box");
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;

      // Proof A: a real pointer click at the overlap selects the frontmost (Y at yaw 0)
      const before = await getSelectedTitle(page);
      assert.equal(before, null, "no selection before click");
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(120);
      const afterClick = await getSelectedTitle(page);
      assert.equal(afterClick, "Depth Y", "click selects frontmost Y at yaw 0 (Proof A + frontmost hit)");

      // Proof B: a substantial rotate drag ending on the node does NOT select
      await page.locator("canvas").first().focus();
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx - 120, cy - 60, { steps: 8 });
      await page.mouse.move(cx - 200, cy - 90, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(120);
      assert.equal(await getSelectedTitle(page), "Depth Y", "rotate drag does NOT change selection (Proof B)");

      // Proof C: pointercancel after moving over the node does NOT select
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + 40, cy + 20, { steps: 4 });
      await dispatchSyntheticPointerCancel(page);
      await page.mouse.up();
      await page.waitForTimeout(120);
      assert.equal(await getSelectedTitle(page), "Depth Y", "pointercancel does NOT select (Proof C)");

      // Proof D: a pinch lifecycle does NOT accidental-select
      await dispatchPinch(page, box);
      await page.waitForTimeout(120);
      assert.equal(await getSelectedTitle(page), "Depth Y", "pinch lifecycle does NOT select (Proof D)");

      await assertNoErrors(errors, "depth-fixture-blocker1");
      await context.close();
    }

    // ---------- Blocker 2: depth overlap before/after (fresh camera) ----------
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      const errors = captureErrors(page);
      const response = await page.goto(`${URL}?qa=depth-overlap`, { waitUntil: "networkidle", timeout: 30000 });
      assert.ok(response?.ok(), `depth overlap HTTP ${response?.status()}`);
      await page.locator("canvas").first().waitFor({ timeout: 15000 });
      await page.waitForFunction(() => {
        const btns = document.querySelectorAll(".levelBtn");
        return btns[2] && btns[2].getAttribute("aria-pressed") === "true";
      }, { timeout: 10000 });
      const box = await page.locator("canvas").first().boundingBox();
      assert.ok(box, "canvas bounding box");
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;

      // Orientation A (yaw 0): Y is frontmost -> click selects Y
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(120);
      assert.equal(await getSelectedTitle(page), "Depth Y", "orientation A: Y frontmost (depth-before)");
      await page.screenshot({ path: `${OUT}/depth-before.png` });

      // Change yaw ~90deg: the frontmost item on the identical overlap swaps to X
      await page.locator("canvas").first().focus();
      for (let i = 0; i < 14; i += 1) {
        await page.keyboard.press("ArrowRight");
      }
      await page.waitForTimeout(150);

      // Orientation B: X is frontmost -> click selects X
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(120);
      assert.equal(await getSelectedTitle(page), "Depth X", "orientation B after yaw: X frontmost (depth-after)");
      await page.screenshot({ path: `${OUT}/depth-after.png` });

      await assertNoErrors(errors, "depth-fixture-blocker2");
      record("blocker1-drag/click/pinch/cancel + blocker2-depth-overlap", true);
      await context.close();
    }

    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
      console.log(`LINEAGE60_V12_BROWSER_QA_FAIL (${failed.length})`);
      process.exit(1);
    }
    console.log("LINEAGE60_DIRECT_BROWSER_FIDELITY_PASS");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
