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
  assert.equal(
    await page.locator('[data-testid="lineage-54-asset-hold"]').count(),
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

async function screenshot(page, name) {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
}

async function driveToChapter(page, chapterName) {
  await page.locator(".lt54-story-list button").filter({ hasText: chapterName }).click();
  await page.locator(".lt54-stage.is-driving").waitFor({ timeout: 1000 });
}

async function assertDesktopTravelAndArrival(page) {
  await driveToChapter(page, "FEELING GROWS");
  await page.waitForTimeout(750);
  assert.match(await page.locator(".lt54-car").getAttribute("src"), /petal-runner-side-v3\.png$/);
  assert.equal(await page.locator(".lt54-speed-field").evaluate((node) => getComputedStyle(node).opacity), "1");
  await page.locator(".lt54-stage.is-driving").waitFor({ state: "detached", timeout: 2500 });
  assert.match(await page.locator(".lt54-chapter-count").innerText(), /SIDE · DEPARTING/);

  await driveToChapter(page, "LOVE BLOOMS");
  await page.locator(".lt54-stage.is-driving").waitFor({ state: "detached", timeout: 2500 });
  assert.match(await page.locator(".lt54-car").getAttribute("src"), /petal-runner-open-v3\.png$/);
  assert.match(await page.locator(".lt54-chapter-count").innerText(), /DOORS OPEN · ARRIVED/);
  assert.equal(await page.locator(".lt54-petals i").count() > 0, true, "arrival bloom renders particles");
  await assertVehicleInsideStage(page, "1280x800 final arrival");
  await screenshot(page, "desktop-final-arrival");
  await page.waitForTimeout(2500);
  assert.equal(await page.locator(".lt54-petals i").count(), 0, "arrival bloom cleans itself up after source lifetime");
}

async function assertDesktopDrag(page) {
  await page.locator(".lt54-story-list button").filter({ hasText: "FIRST MOMENT" }).click();
  await page.locator(".lt54-stage.is-driving").waitFor({ state: "detached", timeout: 2500 }).catch(() => {});
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
  await wrap.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const dispatch = (type, x, buttons) => node.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      pointerId: 54,
      pointerType: "touch",
      isPrimary: true,
      clientX: x,
      clientY: rect.top + rect.height / 2,
      buttons,
    }));
    dispatch("pointerdown", rect.left + rect.width * 0.35, 1);
    dispatch("pointermove", rect.left + rect.width * 0.75, 1);
    dispatch("pointerup", rect.left + rect.width * 0.75, 0);
  });
  await page.waitForTimeout(220);
  const afterSrc = await page.locator(".lt54-car").getAttribute("src");
  assert.notEqual(afterSrc, beforeSrc, "mobile pointer drag changes free vehicle view");
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
        await screenshot(page, scenario.label === "1280x800" ? "desktop-first-moment" : "mobile-first-moment");

        if (scenario.hasTouch) {
          await assertMobilePanelAndTouch(page);
          await page.locator(".lt54-story-list button").filter({ hasText: "LOVE BLOOMS" }).click();
          await page.locator(".lt54-stage.is-driving").waitFor({ state: "detached", timeout: 2500 });
          await assertVehicleInsideStage(page, "390x844 final arrival");
          await screenshot(page, "mobile-final-arrival");
        } else {
          await assertDesktopTravelAndArrival(page);
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
      assert.equal(errors.length, 0, `reduced motion has no runtime/console errors: ${errors.join(" | ")}`);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
