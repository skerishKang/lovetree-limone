import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const URL = `${BASE}/design-lab/lineages/52/v3`;
const EXPECTED_SHA256 = "f8c017f964338a77b4286cc7fe3baed2675e8f6117aff0b83f943c071bf4f45b";
const EXPECTED_BYTES = "1,140,569";

async function attachErrorCapture(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
  return errors;
}

async function openRoute(browser, viewport, options = {}) {
  const page = await browser.newPage({ viewport, ...options });
  const errors = await attachErrorCapture(page);
  const startedAt = Date.now();
  const response = await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  assert.ok(response?.ok(), `Lineage 52 route HTTP ${response?.status()}`);
  await page.locator('.lt-orbit-runner__viewport[data-source-state="ready"]').waitFor({ timeout: 20000 });
  return { page, errors, startedAt };
}

async function sourceFrame(page) {
  const iframe = page.locator(".lt-orbit-runner__iframe");
  await iframe.waitFor({ state: "attached", timeout: 15000 });
  const sandbox = await iframe.getAttribute("sandbox");
  assert.equal(sandbox, "allow-scripts", "source iframe keeps scripts-only sandbox isolation");
  assert.equal(sandbox?.includes("allow-same-origin"), false, "source iframe never grants same-origin");
  const handle = await iframe.elementHandle();
  assert.ok(handle, "source iframe handle exists");
  const frame = await handle.contentFrame();
  assert.ok(frame, "source iframe content frame exists");
  return { iframe, frame };
}

async function waitForOrbitRuntime(frame) {
  await frame.waitForFunction(
    () => window.__V3_READY === true && window.__ORBIT3?.duration === 20,
    null,
    { timeout: 20000 },
  );
  const api = await frame.evaluate(() => ({
    duration: window.__ORBIT3.duration,
    seek: typeof window.__ORBIT3.seek,
    pause: typeof window.__ORBIT3.pause,
    play: typeof window.__ORBIT3.play,
    capture: typeof window.__ORBIT3.capture,
    state: typeof window.__ORBIT3.state,
  }));
  assert.deepEqual(api, {
    duration: 20,
    seek: "function",
    pause: "function",
    play: "function",
    capture: "function",
    state: "function",
  });
}

async function assertTimelineContract(frame) {
  const checkpoints = [
    [0, "QUIET GLOBE"],
    [3, "FIRST CONNECTION WAVE"],
    [6.5, "LARGE LOWER SWEEP"],
    [10.5, "PRIMARY CLIMAX"],
    [14, "SECOND WAVE"],
    [16.5, "MOMENT ACTIVATION"],
    [19, "LOVETREE ORBIT"],
  ];

  for (const [time, expectedLabel] of checkpoints) {
    const label = await frame.evaluate((t) => {
      window.__ORBIT3.pause();
      window.__ORBIT3.seek(t);
      return document.getElementById("evt")?.textContent || "";
    }, time);
    assert.equal(label, expectedLabel, `seek(${time}) reaches ${expectedLabel}`);
  }

  const pausedWidth = await frame.evaluate(() => {
    window.__ORBIT3.pause();
    window.__ORBIT3.seek(6.5);
    return Number.parseFloat(document.getElementById("bar")?.style.width || "0");
  });
  await frame.waitForTimeout(300);
  const pausedWidthAfter = await frame.evaluate(() => Number.parseFloat(document.getElementById("bar")?.style.width || "0"));
  assert.ok(Math.abs(pausedWidthAfter - pausedWidth) < 0.05, `pause freezes timeline: ${pausedWidth} -> ${pausedWidthAfter}`);

  await frame.evaluate(() => {
    window.__ORBIT3.seek(19.6);
    window.__ORBIT3.play();
  });
  await frame.waitForTimeout(850);
  const loopState = await frame.evaluate(() => ({
    width: Number.parseFloat(document.getElementById("bar")?.style.width || "100"),
    label: document.getElementById("evt")?.textContent || "",
    playing: window.__ORBIT3.state().playing,
  }));
  assert.equal(loopState.playing, true, "20s source timeline resumes playing");
  assert.ok(loopState.width < 10, `20s timeline wraps after seek(19.6): ${loopState.width}%`);
  assert.equal(loopState.label, "QUIET GLOBE", "20s loop returns to opening state");
}

async function assertNoOverflow(page, frame, viewportLabel) {
  const outer = await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  const inner = await frame.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    vertical: document.documentElement.scrollHeight > document.documentElement.clientHeight,
  }));
  assert.equal(outer.horizontal, false, `${viewportLabel}: outer route has no horizontal overflow`);
  assert.equal(inner.horizontal, false, `${viewportLabel}: raw source has no horizontal overflow`);
  assert.equal(inner.vertical, false, `${viewportLabel}: raw source has no vertical overflow`);
}

async function assertOuterScrollPriority(page, iframe) {
  await iframe.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => Math.round(scrollY));
  const box = await iframe.boundingBox();
  assert.ok(box, "passive iframe has a bounding box");
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 260));
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => Math.round(scrollY));
  assert.ok(after > before + 100, `passive iframe leaves wheel scrolling to outer page: ${before} -> ${after}`);
}

async function enableInteraction(page) {
  const button = page.locator(".lt-orbit-runner__interaction-controls button");
  await button.click();
  await page.locator('.lt-orbit-runner__viewport[data-interaction-state="interactive"]').waitFor();
}

async function assertDesktopDrag(page, frame) {
  const before = await frame.evaluate(() => window.__ORBIT3.state());
  const canvas = frame.locator("#c");
  const box = await canvas.boundingBox();
  assert.ok(box, "desktop source canvas has a bounding box");
  await page.mouse.move(box.x + box.width * 0.48, box.y + box.height * 0.48);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.66, box.y + box.height * 0.62, { steps: 6 });
  await page.mouse.up();
  const after = await frame.evaluate(() => window.__ORBIT3.state());
  assert.notEqual(after.userYaw, before.userYaw, "desktop drag changes userYaw");
  assert.notEqual(after.userPitch, before.userPitch, "desktop drag changes userPitch");
}

async function assertMobileTouchDrag(frame) {
  const before = await frame.evaluate(() => window.__ORBIT3.state());
  await frame.evaluate(() => {
    const canvas = document.getElementById("c");
    const dispatch = (type, x, y, buttons) => canvas.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      pointerId: 52,
      pointerType: "touch",
      isPrimary: true,
      clientX: x,
      clientY: y,
      buttons,
    }));
    dispatch("pointerdown", 120, 220, 1);
    dispatch("pointermove", 210, 285, 1);
    dispatch("pointerup", 210, 285, 0);
  });
  const after = await frame.evaluate(() => window.__ORBIT3.state());
  assert.notEqual(after.userYaw, before.userYaw, "mobile touch drag changes userYaw");
  assert.notEqual(after.userPitch, before.userPitch, "mobile touch drag changes userPitch");
}

test("Lineage 52 V3 — actual source-runner route satisfies #94 desktop/mobile browser QA", { timeout: 120000 }, async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
  });

  try {
    for (const scenario of [
      { label: "1280x800", viewport: { width: 1280, height: 800 }, hasTouch: false },
      { label: "390x844", viewport: { width: 390, height: 844 }, hasTouch: true },
    ]) {
      const { page, errors, startedAt } = await openRoute(browser, scenario.viewport, { hasTouch: scenario.hasTouch });
      try {
        assert.match(await page.locator(".lt-orbit-runner__mode").innerText(), /SOURCE RUNNER — NOT NATIVE NEXT IMPLEMENTATION/);
        assert.equal(await page.locator(".lt-orbit-runner__meta strong").nth(1).innerText(), EXPECTED_BYTES);
        assert.equal(await page.locator(".lt-orbit-runner__hash code").innerText(), EXPECTED_SHA256);

        const { iframe, frame } = await sourceFrame(page);
        await waitForOrbitRuntime(frame);
        const startupMs = Date.now() - startedAt;
        assert.ok(startupMs < 20000, `${scenario.label}: route source becomes WebGL-ready within 20s (${startupMs}ms)`);
        await assertTimelineContract(frame);
        await assertNoOverflow(page, frame, scenario.label);

        if (scenario.hasTouch) {
          const aspect = await frame.evaluate(() => {
            const canvas = document.getElementById("c");
            return canvas.width / canvas.height;
          });
          assert.ok(aspect < 0.72, `${scenario.label}: source enters portrait camera branch (aspect ${aspect})`);
          await enableInteraction(page);
          await assertMobileTouchDrag(frame);
        } else {
          await assertOuterScrollPriority(page, iframe);
          await enableInteraction(page);
          await assertDesktopDrag(page, frame);
        }

        assert.equal(errors.length, 0, `${scenario.label}: no page/console errors: ${errors.join(" | ")}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});

test("Lineage 52 V3 — reduced motion gates autoplay and permits explicit opt-in", { timeout: 60000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    const errors = await attachErrorCapture(page);
    const response = await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
    assert.ok(response?.ok(), `Lineage 52 reduced-motion route HTTP ${response?.status()}`);
    await page.locator('.lt-orbit-runner__viewport[data-source-state="ready"][data-motion-state="reduced"]').waitFor({ timeout: 20000 });
    assert.equal(await page.locator(".lt-orbit-runner__iframe").count(), 0, "reduced motion does not autoplay the source iframe");
    assert.match(await page.locator(".lt-orbit-runner__motion-gate").innerText(), /원본 모션은 자동 실행하지 않습니다/);
    await page.getByRole("button", { name: "원본 모션 실행" }).click();
    const { frame } = await sourceFrame(page);
    await waitForOrbitRuntime(frame);
    assert.equal(errors.length, 0, `reduced-motion opt-in has no page/console errors: ${errors.join(" | ")}`);
    await page.close();
  } finally {
    await browser.close();
  }
});

test("Lineage 52 V3 — actual route preserves WebGL-required fallback", { timeout: 60000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function patchedGetContext(type, ...args) {
        if (type === "webgl") return null;
        return originalGetContext.call(this, type, ...args);
      };
    });
    const errors = await attachErrorCapture(page);
    const response = await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
    assert.ok(response?.ok(), `Lineage 52 fallback route HTTP ${response?.status()}`);
    await page.locator('.lt-orbit-runner__viewport[data-source-state="ready"]').waitFor({ timeout: 20000 });
    const { frame } = await sourceFrame(page);
    await frame.waitForFunction(() => document.body.textContent?.includes("WebGL required."), null, { timeout: 10000 });
    assert.match(await frame.locator("body").innerText(), /WebGL required\./);
    assert.equal(errors.length, 0, `WebGL fallback has no page/console errors: ${errors.join(" | ")}`);
    await page.close();
  } finally {
    await browser.close();
  }
});
