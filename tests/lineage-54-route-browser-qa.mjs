import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const URL = `${BASE}/design-lab/lineages/54/v4`;
const SCREENSHOT_DIR = process.env.LINEAGE54_SCREENSHOT_DIR || "/tmp/lineage-54-browser-qa";
const EXPECTED_SHA256 = "ea9295e8d8a9fb14d6a0df8ec16e294a13df666770e285a2bbbf69807e38ebd9";
const EXPECTED_ASSETS = [
  "lovetree-arrival-garden-v3.png",
  "petal-runner-front-v3.png",
  "petal-runner-side-v3.png",
  "petal-runner-rear-v3.png",
  "petal-runner-open-v3.png",
];

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
  assert.ok(response?.ok(), `Lineage 54 route HTTP ${response?.status()}`);
  await page.locator(".lt54-shell").waitFor({ timeout: 15000 });
  return { page, errors };
}

async function assertExactAssetsReady(page, label) {
  const hold = page.locator('[data-testid="lineage-54-asset-hold"]');
  await hold.waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
  assert.equal(
    await hold.count(),
    0,
    `${label}: exact asset HOLD must be absent; transfer/verification is not complete`,
  );

  const assetState = await page.locator(".lt54-preload img").evaluateAll((images) =>
    images.map((image) => ({
      src: image.getAttribute("src") || "",
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    })),
  );
  assert.equal(assetState.length, 5, `${label}: all five exact assets are preloaded`);
  for (const file of EXPECTED_ASSETS) {
    const asset = assetState.find((entry) => entry.src.endsWith(`/${file}`));
    assert.ok(asset, `${label}: ${file} uses the registered Git path`);
    assert.equal(asset.complete, true, `${label}: ${file} completed loading`);
    assert.ok(asset.naturalWidth > 0 && asset.naturalHeight > 0, `${label}: ${file} decoded successfully`);
  }
}

async function assertStaticContract(page, label) {
  assert.equal(await page.locator(".lt-flow-runner__hash code").innerText(), EXPECTED_SHA256);
  assert.equal(await page.locator(".lt54-story-list button").count(), 4, `${label}: four story controls`);
  assert.equal(await page.locator(".lt54-timeline button").count(), 4, `${label}: four timeline controls`);
  assert.match(await page.locator(".lt54-chapter-label").innerText(), /CHAPTER 01 · FIRST MOMENT/);
  assert.match(await page.locator(".lt54-chapter-count").innerText(), /FRONT · PARKED/);
  assert.match(await page.locator(".lt54-right-card").innerText(), /MOMENT 001 · DISCOVERED/);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const shell = document.querySelector(".lt54-shell");
    const stage = document.querySelector(".lt54-stage");
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      shell: shell ? shell.scrollWidth - shell.clientWidth : 0,
      stage: stage ? stage.scrollWidth - stage.clientWidth : 0,
    };
  });
  assert.ok(overflow.document <= 1, `${label}: outer route horizontal overflow ${overflow.document}px`);
  assert.ok(overflow.shell <= 1, `${label}: shell horizontal overflow ${overflow.shell}px`);
  assert.ok(overflow.stage <= 1, `${label}: stage horizontal overflow ${overflow.stage}px`);
}

async function assertOuterScrollPriority(page) {
  const stage = page.locator(".lt54-stage");
  await stage.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (maxScroll - window.scrollY < 160) {
      window.scrollTo(0, Math.max(0, window.scrollY - 240));
    }
  });
  const before = await page.evaluate(() => Math.round(window.scrollY));
  const box = await stage.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box && viewport, "desktop stage/viewport exist for scroll-priority QA");
  const x = Math.max(1, Math.min(viewport.width - 2, box.x + box.width * 0.5));
  const y = Math.max(1, Math.min(viewport.height - 2, box.y + Math.min(box.height * 0.35, 260)));
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, 420);
  await page.waitForTimeout(220);
  const after = await page.evaluate(() => Math.round(window.scrollY));
  assert.ok(after > before + 40, `outer page retains wheel scrolling over the stage: ${before} -> ${after}`);
}

async function assertVehicleInsideStage(page, label) {
  const stage = await page.locator(".lt54-stage").boundingBox();
  const vehicle = await page.locator(".lt54-car").boundingBox();
  const timeline = await page.locator(".lt54-timeline").boundingBox();
  assert.ok(stage && vehicle && timeline, `${label}: stage/vehicle/timeline boxes exist`);
  const epsilon = 2;
  assert.ok(vehicle.x >= stage.x - epsilon, `${label}: vehicle left edge stays inside stage`);
  assert.ok(vehicle.x + vehicle.width <= stage.x + stage.width + epsilon, `${label}: vehicle right edge stays inside stage`);
  assert.ok(vehicle.y >= stage.y - epsilon, `${label}: vehicle top edge stays inside stage`);
  assert.ok(vehicle.y + vehicle.height <= stage.y + stage.height + epsilon, `${label}: vehicle bottom edge stays inside stage`);
  assert.ok(vehicle.y + vehicle.height <= timeline.y + epsilon, `${label}: vehicle remains above the timeline safe floor`);
}

async function assertActivePathNodes(page, expected, label) {
  const active = await page.locator(".lt54-memory-path i").evaluateAll((nodes) =>
    nodes.filter((node) => Number.parseFloat(getComputedStyle(node).opacity) > 0.9).length,
  );
  assert.equal(active, expected, `${label}: ${expected} memory path node(s) are active`);
}

async function screenshot(page, name) {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
}

async function waitForTravelEnd(page) {
  await page.locator(".lt54-stage.is-driving").waitFor({ state: "detached", timeout: 2600 });
}

async function clickStoryChapter(page, chapterName) {
  await page.locator(".lt54-story-list button").filter({ hasText: chapterName }).click();
  await page.locator(".lt54-stage.is-driving").waitFor({ timeout: 1000 });
}

async function clickTimelineChapter(page, chapterName) {
  await page.locator(".lt54-timeline button").filter({ hasText: chapterName }).click();
  await page.locator(".lt54-stage.is-driving").waitFor({ timeout: 1000 });
}

async function assertDesktopJourneyControls(page) {
  await page.getByRole("button", { name: "START THE FEELING", exact: true }).click();
  await page.locator(".lt54-stage.is-driving").waitFor({ timeout: 1000 });
  await page.waitForTimeout(600);
  assert.match(await page.locator(".lt54-car").getAttribute("src"), /petal-runner-front-v3\.png$/, "vehicle remains front during the source fade window before replacement loads");
  assert.equal(await page.locator(".lt54-car").evaluate((node) => node.style.opacity), "0.15", "source fade state is active after the 520ms trigger");
  await page.waitForTimeout(180);
  assert.match(await page.locator(".lt54-car").getAttribute("src"), /petal-runner-side-v3\.png$/, "170ms source swap delay reaches the side view");
  assert.equal(await page.locator(".lt54-speed-field").evaluate((node) => getComputedStyle(node).opacity), "1");
  await waitForTravelEnd(page);
  assert.match(await page.locator(".lt54-chapter-count").innerText(), /SIDE · DEPARTING/);
  await assertActivePathNodes(page, 2, "main drive advances to Feeling Grows");

  await clickTimelineChapter(page, "CONNECT");
  await waitForTravelEnd(page);
  assert.match(await page.locator(".lt54-car").getAttribute("src"), /petal-runner-rear-v3\.png$/);
  assert.match(await page.locator(".lt54-chapter-count").innerText(), /REAR · TRAVELLING/);
  await assertActivePathNodes(page, 3, "bottom timeline advances to Connection");

  await page.getByRole("button", { name: "RETURN TO FIRST MOMENT", exact: true }).click();
  await page.locator(".lt54-stage.is-driving").waitFor({ timeout: 1000 });
  await waitForTravelEnd(page);
  assert.match(await page.locator(".lt54-car").getAttribute("src"), /petal-runner-front-v3\.png$/);
  assert.match(await page.locator(".lt54-chapter-count").innerText(), /FRONT · PARKED/);
  await assertActivePathNodes(page, 1, "restart returns to First Moment");
}

async function assertDesktopArrivalAndReplay(page) {
  await clickStoryChapter(page, "LOVE BLOOMS");
  await waitForTravelEnd(page);
  assert.match(await page.locator(".lt54-car").getAttribute("src"), /petal-runner-open-v3\.png$/);
  assert.match(await page.locator(".lt54-chapter-count").innerText(), /DOORS OPEN · ARRIVED/);
  await assertActivePathNodes(page, 4, "final arrival");
  assert.ok(await page.locator(".lt54-petals i").count() > 0, "arrival bloom renders particles");
  await assertVehicleInsideStage(page, "1280x800 final arrival");
  await screenshot(page, "desktop-final-arrival");
  await page.waitForTimeout(2500);
  assert.equal(await page.locator(".lt54-petals i").count(), 0, "arrival bloom cleans itself up after source lifetime");

  await page.getByRole("button", { name: "REPLAY THE JOURNEY", exact: true }).click();
  await page.locator(".lt54-stage.is-driving").waitFor({ timeout: 1000 });
  await waitForTravelEnd(page);
  assert.match(await page.locator(".lt54-chapter-count").innerText(), /FRONT · PARKED/);
  assert.match(await page.locator(".lt54-car").getAttribute("src"), /petal-runner-front-v3\.png$/);
}

async function assertDesktopDrag(page) {
  const wrap = page.locator(".lt54-car-wrap");
  const box = await wrap.boundingBox();
  assert.ok(box, "desktop drag target exists");
  const before = await page.locator(".lt54-car").getAttribute("src");
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.55, { steps: 5 });
  assert.equal(await wrap.evaluate((node) => node.classList.contains("is-dragging")), true, "dragging class is active during pointer drag");
  await page.mouse.up();
  await page.waitForTimeout(220);
  const after = await page.locator(".lt54-car").getAttribute("src");
  assert.notEqual(after, before, "desktop drag changes free vehicle view");
  assert.match(await page.locator(".lt54-chapter-count").innerText(), /FREE ORBIT/);
  assert.equal(await wrap.evaluate((node) => node.classList.contains("is-dragging")), false, "dragging class clears on pointer up");
  assert.equal(await wrap.evaluate((node) => node.style.transform), "none", "resting drag transform resets");
}

async function dispatchTouchDrag(page, locator) {
  const box = await locator.boundingBox();
  assert.ok(box, "mobile touch target exists");
  const session = await page.context().newCDPSession(page);
  const start = { x: box.x + box.width * 0.35, y: box.y + box.height * 0.55 };
  const end = { x: box.x + box.width * 0.75, y: box.y + box.height * 0.55 };
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ ...start, radiusX: 3, radiusY: 3, force: 1, id: 54 }],
  });
  for (let step = 1; step <= 5; step += 1) {
    const progress = step / 5;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress,
        radiusX: 3,
        radiusY: 3,
        force: 1,
        id: 54,
      }],
    });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await session.detach();
}

async function assertMobilePanelAndTouch(page) {
  const panel = page.locator(".lt54-side--right");
  const before = await panel.boundingBox();
  assert.ok(before, "mobile service panel exists off-canvas");
  assert.ok(before.x >= 390 - 4, `mobile panel starts off-canvas (${before.x})`);
  await page.getByRole("button", { name: "STORY & SERVICE" }).click();
  await page.waitForTimeout(380);
  const opened = await panel.boundingBox();
  assert.ok(opened, "mobile service panel opens");
  assert.ok(opened.x >= 0 && opened.x + opened.width <= 390 + 1, "mobile service panel fits viewport when open");

  await page.getByRole("button", { name: "STORY & SERVICE" }).click();
  await page.waitForTimeout(380);
  const wrap = page.locator(".lt54-car-wrap");
  const beforeSrc = await page.locator(".lt54-car").getAttribute("src");
  await dispatchTouchDrag(page, wrap);
  await page.waitForTimeout(220);
  const afterSrc = await page.locator(".lt54-car").getAttribute("src");
  assert.notEqual(afterSrc, beforeSrc, "mobile touch drag changes free vehicle view");
  assert.match(await page.locator(".lt54-chapter-count").innerText(), /FREE ORBIT/);
  assert.equal(await wrap.evaluate((node) => node.classList.contains("is-dragging")), false, "touch pointer end clears dragging state");
}

test("Lineage 54 V4 — exact-asset native route satisfies desktop/mobile source-fidelity browser contracts", { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const scenario of [
      { label: "1280x800", viewport: { width: 1280, height: 800 } },
      { label: "390x844", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    ]) {
      const { page, errors } = await openRoute(browser, scenario.viewport, { isMobile: scenario.isMobile, hasTouch: scenario.hasTouch });
      try {
        await assertExactAssetsReady(page, scenario.label);
        await assertStaticContract(page, scenario.label);
        await assertNoHorizontalOverflow(page, scenario.label);
        await assertVehicleInsideStage(page, `${scenario.label} first moment`);
        await assertActivePathNodes(page, 1, `${scenario.label} first moment`);
        await screenshot(page, scenario.label === "1280x800" ? "desktop-first-moment" : "mobile-first-moment");

        if (scenario.hasTouch) {
          await assertMobilePanelAndTouch(page);
          await clickStoryChapter(page, "LOVE BLOOMS");
          await waitForTravelEnd(page);
          await assertActivePathNodes(page, 4, "390x844 final arrival");
          await assertVehicleInsideStage(page, "390x844 final arrival");
          await screenshot(page, "mobile-final-arrival");
        } else {
          await assertOuterScrollPriority(page);
          await assertDesktopJourneyControls(page);
          await assertDesktopArrivalAndReplay(page);
          await assertDesktopDrag(page);
        }

        assert.equal(errors.length, 0, `${scenario.label}: no runtime/console errors: ${errors.join(" | ")}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});

test("Lineage 54 V4 — reduced motion changes chapters immediately without travel animation", { timeout: 60000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openRoute(browser, { width: 1280, height: 800 }, { reducedMotion: "reduce" });
    try {
      await assertExactAssetsReady(page, "reduced-motion");
      await page.locator(".lt54-story-list button").filter({ hasText: "CONNECTION" }).click();
      await page.waitForTimeout(80);
      assert.equal(await page.locator(".lt54-stage.is-driving").count(), 0, "reduced motion never enters travel animation state");
      assert.match(await page.locator(".lt54-car").getAttribute("src"), /petal-runner-rear-v3\.png$/);
      assert.match(await page.locator(".lt54-motion-policy").innerText(), /Reduced motion:/);
      await assertActivePathNodes(page, 3, "reduced-motion Connection state");
      assert.equal(errors.length, 0, `reduced motion has no runtime/console errors: ${errors.join(" | ")}`);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
