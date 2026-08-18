import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.LOVETREE_QA_BASE_URL || process.env.LINEAGE52_PHASE2_QA_URL || "http://127.0.0.1:3000";
const ROUTE = "/design-lab/lineages/52/phase-2";
const URL = `${BASE}${ROUTE}`;
const OUT = "qa/evidence/lineage-52-phase2";

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
  assert.ok(response?.ok(), `Lineage52 Phase2 route HTTP ${response?.status()}`);
  await page.getByTestId("lineage52-phase2-proof").waitFor({ timeout: 15000 });
  await page.waitForFunction(() => window.__LINEAGE52_PHASE2__ !== undefined, { timeout: 15000 });
  return { context, page, errors };
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  assert.ok(overflow <= 1, `${label}: horizontal overflow ${overflow}px`);
}

function assertNoErrors(errors, label) {
  assert.deepEqual(errors, [], `${label}: no console/page errors: ${errors.join(" | ")}`);
}

async function state(page) {
  return page.evaluate(() => window.__LINEAGE52_PHASE2__.getState());
}

async function genuineTouchDrag(page) {
  const canvas = page.getByTestId("lineage52-phase2-canvas");
  const box = await canvas.boundingBox();
  assert.ok(box, "touch canvas bounding box exists");
  const session = await page.context().newCDPSession(page);
  const point = (x, y) => ({
    x: box.x + box.width * x,
    y: box.y + box.height * y,
    radiusX: 6,
    radiusY: 6,
    force: 1,
    id: 1,
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point(0.65, 0.52)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [point(0.48, 0.44)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [point(0.34, 0.40)],
  });
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
    for (const spec of [
      { label: "desktop-1280x800", viewport: { width: 1280, height: 800 } },
      { label: "mobile-390x844", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
      { label: "mobile-320x720", viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true },
    ]) {
      const { context, page, errors } = await openRoute(browser, spec.viewport, {
        isMobile: spec.isMobile,
        hasTouch: spec.hasTouch,
      });
      try {
        await page.waitForFunction(
          () => document.querySelector('[data-testid="lineage52-phase2-proof"]')?.getAttribute("data-webgl-ready") === "true",
          { timeout: 15000 },
        );
        assert.equal((await state(page)).webgl, true, `${spec.label}: WebGL context available`);
        assert.ok(await page.locator('[aria-label="Spatial Moments"] button').count() >= 6, "semantic Moment controls present");
        assert.ok(await page.locator('[aria-label="Spatial Connections"] li').count() >= 5, "semantic Connection state present");
        await assertNoHorizontalOverflow(page, spec.label);
        assertNoErrors(errors, spec.label);
        await page.screenshot({ path: `${OUT}/${spec.label}.png`, fullPage: true });
        record(`viewport:${spec.label}`, true);
      } finally {
        await context.close();
      }
    }

    // Desktop pointer drag + wheel + keyboard camera equivalence.
    {
      const { context, page, errors } = await openRoute(browser, { width: 1280, height: 800 });
      try {
        const canvas = page.getByTestId("lineage52-phase2-canvas");
        const box = await canvas.boundingBox();
        assert.ok(box, "desktop canvas bounding box exists");
        const before = await state(page);
        await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.38, { steps: 8 });
        await page.mouse.up();
        const afterDrag = await state(page);
        assert.notEqual(afterDrag.yaw, before.yaw, "pointer drag changes yaw");
        assert.notEqual(afterDrag.pitch, before.pitch, "pointer drag changes pitch");

        await canvas.hover();
        const beforeWheel = await state(page);
        await page.mouse.wheel(0, 520);
        await page.waitForTimeout(80);
        const afterWheel = await state(page);
        assert.ok(afterWheel.distance > beforeWheel.distance, "wheel performs bounded dolly/zoom");

        await canvas.focus();
        const beforeKey = await state(page);
        await page.keyboard.press("ArrowLeft");
        const afterKey = await state(page);
        assert.ok(afterKey.yaw < beforeKey.yaw, "keyboard arrow provides camera equivalent");
        const beforeSelected = afterKey.selectedMomentId;
        await page.keyboard.press("n");
        const afterSelected = (await state(page)).selectedMomentId;
        assert.notEqual(afterSelected, beforeSelected, "keyboard N changes semantic Moment focus");
        assertNoErrors(errors, "desktop-inputs");
        record("pointer+wheel+keyboard-camera", true);
      } finally {
        await context.close();
      }
    }

    // Genuine touch pointer path.
    {
      const { context, page, errors } = await openRoute(
        browser,
        { width: 390, height: 844 },
        { isMobile: true, hasTouch: true },
      );
      try {
        const before = await state(page);
        await genuineTouchDrag(page);
        await page.waitForTimeout(80);
        const after = await state(page);
        assert.notEqual(after.yaw, before.yaw, "genuine touch drag changes yaw");
        assert.notEqual(after.pitch, before.pitch, "genuine touch drag changes pitch");
        assertNoErrors(errors, "genuine-touch");
        record("genuine-touch-camera", true);
      } finally {
        await context.close();
      }
    }

    // Deterministic transport hooks + route growth/pulse semantic projection.
    {
      const { context, page, errors } = await openRoute(browser, { width: 1280, height: 800 });
      try {
        await page.getByRole("button", { name: "Pause", exact: true }).click();
        await page.evaluate(() => window.__LINEAGE52_PHASE2__.setProgress(0.18));
        await page.waitForTimeout(80);
        const early = await state(page);
        const earlyText = await page.locator('[data-connection-id="c-01"]').innerText();
        assert.equal(early.progress, 0.18);
        assert.match(earlyText, /reveal\s+(?:1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9])%/);

        await page.evaluate(() => window.__LINEAGE52_PHASE2__.setProgress(0.92));
        await page.waitForTimeout(80);
        const late = await state(page);
        const lateText = await page.locator('[data-connection-id="c-01"]').innerText();
        assert.equal(late.progress, 0.92);
        assert.match(lateText, /reveal 100%/);

        await page.getByRole("button", { name: "Restart", exact: true }).click();
        await page.waitForTimeout(40);
        assert.ok((await state(page)).progress < 0.03, "restart resets deterministic transport near zero");
        assertNoErrors(errors, "transport-growth");
        record("deterministic-transport+route-growth", true);
      } finally {
        await context.close();
      }
    }

    // Reduced motion: no continuous auto orbit/pulse policy, semantics and controls remain usable.
    {
      const { context, page, errors } = await openRoute(
        browser,
        { width: 390, height: 844 },
        { isMobile: true, hasTouch: true, reducedMotion: "reduce" },
      );
      try {
        await page.waitForFunction(
          () => document.querySelector('[data-testid="lineage52-phase2-proof"]')?.getAttribute("data-reduced-motion") === "true",
          { timeout: 10000 },
        );
        const before = await state(page);
        assert.equal(before.reducedMotion, true);
        assert.equal(before.autoOrbit, false);
        await page.waitForTimeout(450);
        const afterWait = await state(page);
        assert.equal(afterWait.yaw, before.yaw, "reduced motion suppresses continuous orbit");
        await page.getByTestId("lineage52-phase2-canvas").focus();
        await page.keyboard.press("ArrowRight");
        const afterKey = await state(page);
        assert.ok(afterKey.yaw > before.yaw, "manual keyboard camera remains available under reduced motion");
        await page.getByRole("button", { name: "Pause", exact: true }).click();
        await page.getByRole("button", { name: "Play", exact: true }).click();
        assert.ok(await page.locator('[aria-label="Spatial Moments"] button').count() >= 6, "semantic fallback remains available");
        await page.screenshot({ path: `${OUT}/reduced-motion-390x844.png`, fullPage: true });
        assertNoErrors(errors, "reduced-motion");
        record("reduced-motion-native-policy", true);
      } finally {
        await context.close();
      }
    }

    // WebGL unavailable must fail safely while preserving semantic critical state.
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await context.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function patched(type, ...args) {
          if (type === "webgl") return null;
          return original.call(this, type, ...args);
        };
      });
      const page = await context.newPage();
      const errors = captureErrors(page);
      const response = await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
      assert.ok(response?.ok(), `fallback route HTTP ${response?.status()}`);
      await page.getByTestId("webgl-fallback").waitFor({ timeout: 10000 });
      assert.match(await page.getByTestId("webgl-fallback").innerText(), /WebGL unavailable/i);
      assert.ok(await page.locator('[aria-label="Spatial Moments"] button').count() >= 6, "fallback keeps Moments reachable");
      assert.ok(await page.locator('[aria-label="Spatial Connections"] li').count() >= 5, "fallback keeps Connections reachable");
      await assertNoHorizontalOverflow(page, "webgl-fallback");
      assertNoErrors(errors, "webgl-fallback");
      await page.screenshot({ path: `${OUT}/webgl-fallback-390x844.png`, fullPage: true });
      record("webgl-unavailable-semantic-fallback", true);
      await context.close();
    }

    // Actual depth-buffer occlusion proof: same center projection, front identity swaps after yaw PI.
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      const errors = captureErrors(page);
      const response = await page.goto(`${URL}?qa=depth`, { waitUntil: "networkidle", timeout: 30000 });
      assert.ok(response?.ok(), `depth route HTTP ${response?.status()}`);
      await page.waitForFunction(
        () => window.__LINEAGE52_PHASE2__?.getState().webgl === true,
        { timeout: 15000 },
      );
      await page.evaluate(() => window.__LINEAGE52_PHASE2__.setYaw(0));
      await page.waitForTimeout(120);
      const yaw0 = await page.evaluate(() => window.__LINEAGE52_PHASE2__.readCenterPixel());
      assert.ok(yaw0 && yaw0[0] > yaw0[1], `yaw0 center pixel is front red: ${yaw0}`);
      await page.screenshot({ path: `${OUT}/depth-yaw0.png`, fullPage: true });

      await page.evaluate(() => window.__LINEAGE52_PHASE2__.setYaw(Math.PI));
      await page.waitForTimeout(120);
      const yawPi = await page.evaluate(() => window.__LINEAGE52_PHASE2__.readCenterPixel());
      assert.ok(yawPi && yawPi[1] > yawPi[0], `yawPI center pixel is front green: ${yawPi}`);
      assert.notDeepEqual(yawPi, yaw0, "depth-visible identity changes after yaw rotation");
      await page.screenshot({ path: `${OUT}/depth-yaw-pi.png`, fullPage: true });
      assertNoErrors(errors, "depth-occlusion");
      record("actual-webgl-depth-occlusion", true, `yaw0=${yaw0} yawPI=${yawPi}`);
      await context.close();
    }
  } finally {
    await browser.close();
    await writeFile(`${OUT}/qa-results.json`, JSON.stringify(results, null, 2));
  }

  assert.ok(results.length >= 9, "expected broad native QA coverage");
  assert.ok(results.every((result) => result.ok), "all Lineage52 Phase2 browser QA results pass");
  console.log("LINEAGE52_PHASE2_NATIVE_BROWSER_QA=PASS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});