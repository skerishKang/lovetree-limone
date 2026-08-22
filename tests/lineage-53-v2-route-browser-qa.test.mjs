import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const URL = `${BASE}/design-lab/lineages/53/v2`;
const EXPECTED_SHA256 = "9dff1d204b6d09bb7198b5f61965c2bd81e08d04dec8b6b59d4c07807d07b847";

async function captureErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
  return errors;
}

async function openRoute(browser, viewport, options = {}) {
  const page = await browser.newPage({ viewport, ...options });
  const errors = await captureErrors(page);
  const response = await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  assert.ok(response?.ok(), `Lineage 53 V2 route HTTP ${response?.status()}`);
  await page.locator(".lt53-motion").waitFor({ timeout: 15000 });
  return { page, errors };
}

async function assertStaticFidelity(page, label) {
  assert.match(await page.locator(".lt-flow-runner__mode").innerText(), /NATIVE FIDELITY REVIEW — LOVETREE SOURCE/);
  assert.match(await page.locator(".lt-flow-runner__meta").innerText(), /39,162/);
  assert.equal(await page.locator(".lt-flow-runner__hash code").innerText(), EXPECTED_SHA256);
  assert.equal(await page.locator(".lt53-motion__moment").count(), 7, `${label}: seven source Moments`);
  assert.equal(await page.locator(".lt53-motion__connection-skeleton").count(), 6, `${label}: six source Connections`);
  const skeletonOpacity = await page.locator(".lt53-motion__connection-skeleton").first().evaluate((node) => getComputedStyle(node).opacity);
  assert.equal(skeletonOpacity, "0.22", `${label}: idle Connection skeleton remains visibly present`);
  assert.match(await page.locator(".lt53-motion__moment").first().innerText(), /처음 멈춰 본 장면/);
  assert.match(await page.locator(".lt53-motion__moment").last().innerText(), /완전히 빠진 순간/);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    stage: document.querySelector(".lt53-motion")?.scrollWidth - document.querySelector(".lt53-motion")?.clientWidth,
  }));
  assert.ok((overflow.document ?? 0) <= 1, `${label}: outer route horizontal overflow ${overflow.document}px`);
  assert.ok((overflow.stage ?? 0) <= 1, `${label}: stage horizontal overflow ${overflow.stage}px`);
}

async function replayFromStart(page) {
  await page.getByRole("button", { name: "REPLAY", exact: true }).click();
  await page.locator(".lt53-motion__connection-active-inner").waitFor({ timeout: 3000 });
}

test("Lineage 53 V2 — native route matches the source replay contract at desktop and mobile", { timeout: 240000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const scenario of [
      { label: "1280x800", viewport: { width: 1280, height: 800 } },
      { label: "390x844", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    ]) {
      const { page, errors } = await openRoute(browser, scenario.viewport, { isMobile: scenario.isMobile, hasTouch: scenario.hasTouch });
      try {
        await assertStaticFidelity(page, scenario.label);
        await assertNoHorizontalOverflow(page, scenario.label);

        await replayFromStart(page);
        assert.equal(await page.locator(".lt53-motion__connection-active-outer").count(), 1, `${scenario.label}: active outer bloom exists`);
        assert.equal(await page.locator(".lt53-motion__connection-active-inner").count(), 1, `${scenario.label}: active inner light path exists`);
        await page.locator(".lt53-motion__tip").waitFor({ timeout: 2000 });

        const activePath = page.locator(".lt53-motion__connection-active-inner");
        await page.getByRole("button", { name: "PAUSE", exact: true }).click();
        // #362: the old 120ms/380ms fixed-delay double sample raced the pause
        // commit itself. If React committed the paused state after the first
        // sample, the light kept advancing and the identity assert failed
        // spuriously — the same timing-dependent family kilo-1 fixed for the
        // RESUME side in #360. Wait for the commit instead: the control label
        // flips PAUSE -> RESUME in the same React commit whose effects set
        // pausedRef (Lineage53V2Motion.tsx), so a visible RESUME proves the
        // freeze is armed before observation starts.
        await page.waitForFunction(
          () =>
            [...document.querySelectorAll(".lt53-motion__controls button")].some(
              (button) => button.textContent?.trim() === "RESUME",
            ),
          undefined,
          { timeout: 45000, polling: 100 },
        );
        // Let the commit's passive effects (the pausedRef sync in
        // Lineage53V2Motion.tsx) settle across an animation-frame boundary
        // before sampling the offset.
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
        const pausedOffset = await activePath.evaluate((node) => node.style.strokeDashoffset);
        // Freeze contract, unchanged in purpose and strictly stronger in
        // observation: prove the offset holds still across a bounded window.
        // The old code compared two instants ~500ms apart; this watches every
        // animation frame for a full second (rAF polling), so it can only
        // catch more. Any movement is a hard failure with diagnostics; the
        // expected path is the timeout — nothing moved means frozen.
        // Predicate runs in Playwright's isolated world: no cross-realm
        // constructors (see #360).
        try {
          await page.waitForFunction(
            (previous) => {
              const node = document.querySelector(".lt53-motion__connection-active-inner");
              return Boolean(node) && node.style.strokeDashoffset !== previous;
            },
            pausedOffset,
            { timeout: 1000, polling: "raf" },
          );
          const diag = await page.evaluate(
            (start) =>
              JSON.stringify({
                offsetStart: start,
                offsetNow: document.querySelector(".lt53-motion__connection-active-inner")?.style.strokeDashoffset ?? null,
                controls: [...document.querySelectorAll(".lt53-motion__controls button")].map((b) => `${b.textContent}${b.disabled ? ":disabled" : ""}`),
              }),
            pausedOffset,
          ).catch((error) => `diag-unavailable: ${error?.message ?? error}`);
          assert.fail(`${scenario.label}: pause must freeze the active Connection light [${diag}]`);
        } catch (error) {
          // The waitForFunction timeout IS the freeze contract holding.
          // This playwright build exposes no TimeoutError symbol (#362), but
          // timeout failures still carry name === `"TimeoutError"`; anything
          // else (evaluate/page failure) propagates. The assert.fail above
          // carries our own label/name, so it always propagates too.
          if (error?.name !== "TimeoutError") throw error;
        }

        await page.getByRole("button", { name: "RESUME", exact: true }).click();
        // The light advances on the animation frame after the resume commit.
        // Sample-at-a-fixed-delay lost here twice (#344 production-deploy
        // incidents at a fixed 320ms) because a stalled renderer frame
        // leaves the paused value on screen. Wait for the transition itself.
        // The predicate runs in Playwright's isolated world, so it must not
        // use cross-realm constructors (instanceof HTMLElement is always
        // false for SVG nodes there). Disappearance of the active node
        // counts as progression too: the replay has moved past this
        // Connection toward the climax. On timeout, attach a rAF frame
        // counter and control-bar state to classify the stall:
        //   frames === 0            -> renderer/main-thread stall (env)
        //   frames > 0, same offset -> pausedRef stuck (product side)
        // The resume-continues contract below stays a hard assertion.
        await page.evaluate(() => {
          window.__l53frames = 0;
          const tick = () => {
            window.__l53frames += 1;
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        try {
          await page.waitForFunction(
            (previous) => {
              const node = document.querySelector(".lt53-motion__connection-active-inner");
              if (!node) return true;
              return node.style.strokeDashoffset !== previous;
            },
            pausedOffset,
            { timeout: 45000, polling: 100 },
          );
        } catch {
          const diag = await page.evaluate(() => JSON.stringify({
            visibility: document.visibilityState,
            frames: window.__l53frames ?? null,
            activeNodePresent: !!document.querySelector(".lt53-motion__connection-active-inner"),
            offsetNow: document.querySelector(".lt53-motion__connection-active-inner")?.style.strokeDashoffset ?? null,
            controls: [...document.querySelectorAll(".lt53-motion__controls button")].map((b) => `${b.textContent}${b.disabled ? ":disabled" : ""}`),
          }), { timeout: 10000 }).catch((error) => `diag-unavailable: ${error?.message ?? error}`);
          assert.fail(`${scenario.label}: resume continues the active Connection light [${diag}]`);
        }

        const speed = page.getByRole("button", { name: /SPEED/ });
        assert.equal(await speed.innerText(), "SPEED 1×");
        await speed.click();
        assert.equal(await speed.innerText(), "SPEED 1.25×", `${scenario.label}: source speed control cycles`);

        const thirdMoment = page.locator(".lt53-motion__moment").nth(2);
        await thirdMoment.click();
        await page.waitForTimeout(100);
        assert.equal(await page.locator(".lt53-motion__connection-memory").count(), 2, `${scenario.label}: replay-from-Moment preserves prior path memory`);
        assert.ok(await thirdMoment.evaluate((node) => node.classList.contains("is-active") || node.classList.contains("is-awake")), `${scenario.label}: clicked Moment starts the replay sequence there`);

        assert.equal(errors.length, 0, `${scenario.label}: no runtime/console errors: ${errors.join(" | ")}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});

test("Lineage 53 V2 — full replay reaches the Living Tree climax", { timeout: 30000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openRoute(browser, { width: 1280, height: 800 });
    try {
      const speed = page.getByRole("button", { name: /SPEED/ });
      await speed.click();
      await speed.click();
      await speed.click();
      assert.equal(await speed.innerText(), "SPEED 2×");
      await page.getByRole("button", { name: "REPLAY", exact: true }).click();
      await page.locator(".lt53-motion.is-living-tree").waitFor({ timeout: 8000 });
      await page.locator(".lt53-motion__message.is-visible").waitFor({ timeout: 1000 });
      assert.match(await page.locator(".lt53-motion__message").innerText(), /YOUR MOMENTS BECOME A PATH/);
      assert.equal(await page.locator(".lt53-motion__connection-memory").count(), 6, "all six Connections remain as memory traces at climax");
      assert.equal(await page.locator(".lt53-motion__moment.is-awake").count(), 7, "all seven Moments remain awake at climax");
      assert.equal(errors.length, 0, `climax has no runtime/console errors: ${errors.join(" | ")}`);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("Lineage 53 V2 — reduced motion blocks autoplay and keeps explicit manual playback", { timeout: 30000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openRoute(browser, { width: 1280, height: 800 }, { reducedMotion: "reduce" });
    try {
      await page.waitForTimeout(1200);
      assert.equal(await page.locator(".lt53-motion__connection-active-inner").count(), 0, "reduced-motion mode does not autoplay the replay");
      const gate = page.getByRole("button", { name: /모션 감소 설정 활성/ });
      await gate.waitFor();
      await gate.click();
      await page.locator(".lt53-motion__connection-active-inner").waitFor({ timeout: 3000 });
      assert.equal(errors.length, 0, `reduced-motion manual playback has no runtime/console errors: ${errors.join(" | ")}`);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
