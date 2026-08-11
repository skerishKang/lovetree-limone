import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const URL = `${BASE}/design-lab/capabilities/memory-anatomy`;
const LAYERS = [
  ["SOURCE VIDEO", "ORIGINAL"],
  ["MOMENT CUT", "TIMECODE"],
  ["PERSON LOCK", "IDENTITY"],
  ["OUTFIT MAP", "COSTUME"],
  ["EMOTION", "FEELING"],
  ["MY NOTE", "PERSONAL"],
  ["CONNECTION", "NEXT PATH"],
];

function captureErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
  return errors;
}

async function openRoute(browser, viewport, options = {}) {
  const page = await browser.newPage({ viewport, ...options });
  const errors = captureErrors(page);
  const response = await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  assert.ok(response?.ok(), `Memory Anatomy route HTTP ${response?.status()}`);
  await page.getByRole("heading", { name: /One Moment/ }).waitFor({ timeout: 15000 });
  return { page, errors };
}

function layerButton(page, title, subtitle) {
  return page.getByRole("button", { name: new RegExp(`${title}.*${subtitle}`, "i") });
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  assert.ok(overflow.document <= 1, `${label}: document horizontal overflow ${overflow.document}px`);
  assert.ok(overflow.body <= 1, `${label}: body horizontal overflow ${overflow.body}px`);
}

async function assertSevenAccessibleLayers(page, label) {
  for (const [title, subtitle] of LAYERS) {
    assert.equal(await layerButton(page, title, subtitle).count(), 1, `${label}: ${title}/${subtitle} is exposed exactly once in the 2D controls`);
  }
  assert.equal(await page.getByRole("slider", { name: "Explosion amount" }).count(), 1, `${label}: explosion slider is reachable`);
  assert.equal(await page.getByRole("button", { name: "ASSEMBLE", exact: true }).count(), 1, `${label}: assemble is reachable`);
  assert.equal(await page.getByRole("button", { name: "EXPLODE", exact: true }).count(), 1, `${label}: explode is reachable`);
}

async function assertPanelsFitViewport(page, label) {
  for (const locator of [
    page.getByRole("slider", { name: "Explosion amount" }).locator("xpath=ancestor::aside[1]"),
    page.getByRole("heading", { name: "SOURCE VIDEO", exact: true }).locator("xpath=ancestor::aside[1]"),
    page.locator('[data-spatial-authority="false"]'),
  ]) {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    assert.ok(box, `${label}: panel has layout box`);
    assert.ok(box.x >= -1, `${label}: panel does not escape left viewport (${box.x})`);
    assert.ok(box.x + box.width <= (await page.evaluate(() => innerWidth)) + 1, `${label}: panel does not escape right viewport`);
  }
}

async function exerciseSemanticControls(page, label) {
  const slider = page.getByRole("slider", { name: "Explosion amount" });
  await page.getByRole("button", { name: "ASSEMBLE", exact: true }).click();
  assert.equal(await slider.inputValue(), "0", `${label}: assemble sets zero explosion`);
  await page.getByRole("button", { name: "EXPLODE", exact: true }).click();
  assert.equal(await slider.inputValue(), "100", `${label}: explode sets full explosion`);
  await slider.fill("37");
  assert.equal(await slider.inputValue(), "37", `${label}: arbitrary explosion is retained`);

  await layerButton(page, "EMOTION", "FEELING").click();
  await page.getByRole("heading", { name: "EMOTION", exact: true }).waitFor();
  assert.match(await page.getByRole("heading", { name: "EMOTION", exact: true }).locator("xpath=ancestor::aside[1]").innerText(), /NO SCORE/, `${label}: inspector preserves synthetic no-score boundary`);

  const source = layerButton(page, "SOURCE VIDEO", "ORIGINAL");
  await source.focus();
  await source.press("ArrowDown");
  assert.match(await page.evaluate(() => document.activeElement?.textContent ?? ""), /MOMENT CUT/, `${label}: ArrowDown moves focus to adjacent layer`);
  await page.getByRole("heading", { name: "MOMENT CUT", exact: true }).waitFor();
  await page.keyboard.press("Enter");
  assert.equal(await page.getByRole("heading", { name: "MOMENT CUT", exact: true }).count(), 1, `${label}: Enter keeps canonical selected layer active`);
}

async function exerciseWheelAuthority(page, label) {
  const stage = page.locator('[data-spatial-authority="false"]');
  const slider = page.getByRole("slider", { name: "Explosion amount" });
  await stage.scrollIntoViewIfNeeded();
  await stage.hover();
  const beforeOuter = await page.evaluate(() => scrollY);
  const outerDelta = beforeOuter > 80 ? -240 : 240;
  await page.mouse.wheel(0, outerDelta);
  await page.waitForTimeout(120);
  const afterOuter = await page.evaluate(() => scrollY);
  assert.notEqual(Math.round(afterOuter), Math.round(beforeOuter), `${label}: outer page scroll wins before spatial authority`);

  await page.getByRole("button", { name: "ENABLE SPATIAL CONTROL", exact: true }).click();
  const activeStage = page.locator('[data-spatial-authority="true"]');
  await activeStage.scrollIntoViewIfNeeded();
  await activeStage.hover();
  const beforeControlledScroll = await page.evaluate(() => scrollY);
  const beforeExplosion = Number(await slider.inputValue());
  await page.mouse.wheel(0, 220);
  await page.waitForTimeout(120);
  const afterControlledScroll = await page.evaluate(() => scrollY);
  const afterExplosion = Number(await slider.inputValue());
  assert.ok(Math.abs(afterControlledScroll - beforeControlledScroll) <= 2, `${label}: spatial wheel does not move the outer page`);
  assert.notEqual(afterExplosion, beforeExplosion, `${label}: spatial wheel changes explosion amount`);
}

async function exercisePointerDrag(page, label) {
  const stage = page.locator('[data-spatial-authority="true"]');
  const stack = stage.locator('[style*="--rotation-x"]');
  const before = await stack.getAttribute("style");
  const box = await stage.boundingBox();
  assert.ok(box, `${label}: stage has a drag box`);
  const x = box.x + box.width * 0.5;
  const y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 70, y - 45, { steps: 4 });
  await page.mouse.up();
  const after = await stack.getAttribute("style");
  assert.notEqual(after, before, `${label}: pointer drag changes stack orientation`);
}

async function exerciseTouchDrag(page, label) {
  const stage = page.locator('[data-spatial-authority="true"]');
  const stack = stage.locator('[style*="--rotation-x"]');
  const before = await stack.getAttribute("style");
  const box = await stage.boundingBox();
  assert.ok(box, `${label}: touch stage has a layout box`);
  const session = await page.context().newCDPSession(page);
  const x = Math.round(box.x + box.width * 0.5);
  const y = Math.round(box.y + box.height * 0.5);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, radiusX: 2, radiusY: 2, force: 1, id: 1 }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 55, y: y - 34, radiusX: 2, radiusY: 2, force: 1, id: 1 }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(80);
  const after = await stack.getAttribute("style");
  assert.notEqual(after, before, `${label}: real Chromium touch drag changes stack orientation`);
}

async function exerciseSpatialLayerSelection(page, label) {
  const stage = page.locator('[data-spatial-authority="true"]');
  await stage.getByText("MY NOTE", { exact: true }).first().click({ force: true });
  await page.getByRole("heading", { name: "MY NOTE", exact: true }).waitFor();
  assert.match(await page.getByRole("heading", { name: "MY NOTE", exact: true }).locator("xpath=ancestor::aside[1]").innerText(), /USER AUTHORED/, `${label}: spatial click and 2D inspector share selected state`);
}

async function exercisePlaybackAndTakeover(page, label) {
  await page.getByRole("button", { name: "REPLAY FROM 01", exact: true }).click();
  await page.waitForTimeout(930);
  await page.getByRole("heading", { name: "MOMENT CUT", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Ⅱ PAUSE STORY", exact: true }).count(), 1, `${label}: story enters playing state`);

  await layerButton(page, "MY NOTE", "PERSONAL").click();
  assert.equal(await page.getByRole("button", { name: "▶ PLAY 1→7 STORY", exact: true }).count(), 1, `${label}: manual layer selection immediately pauses playback`);
  assert.equal(await page.getByRole("heading", { name: "MY NOTE", exact: true }).count(), 1, `${label}: manual takeover keeps user selection`);

  await page.getByRole("button", { name: "REPLAY FROM 01", exact: true }).click();
  await page.waitForTimeout(6400);
  await page.getByRole("button", { name: "↻ REPLAY STORY", exact: true }).waitFor();
  assert.equal(await page.getByRole("heading", { name: "CONNECTION", exact: true }).count(), 1, `${label}: story reaches layer 7`);
  assert.equal(await page.getByRole("slider", { name: "Explosion amount" }).inputValue(), "0", `${label}: story completion reassembles the stack`);
}

test("Memory Anatomy — desktop/mobile/touch contracts on the actual route", { timeout: 150000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const scenario of [
      { label: "1280x800", viewport: { width: 1280, height: 800 } },
      { label: "390x844", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
      { label: "320x720", viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true },
    ]) {
      const { page, errors } = await openRoute(browser, scenario.viewport, { isMobile: scenario.isMobile, hasTouch: scenario.hasTouch });
      try {
        await assertSevenAccessibleLayers(page, scenario.label);
        await assertNoHorizontalOverflow(page, scenario.label);
        await assertPanelsFitViewport(page, scenario.label);
        await exerciseSemanticControls(page, scenario.label);
        await exerciseWheelAuthority(page, scenario.label);
        if (scenario.hasTouch) await exerciseTouchDrag(page, scenario.label);
        else await exercisePointerDrag(page, scenario.label);
        await exerciseSpatialLayerSelection(page, scenario.label);
        await exercisePlaybackAndTakeover(page, scenario.label);
        await assertNoHorizontalOverflow(page, scenario.label);
        assert.equal(errors.length, 0, `${scenario.label}: no page/console errors: ${errors.join(" | ")}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});

test("Memory Anatomy — reduced motion preserves all semantics without animated depth/rotation", { timeout: 30000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openRoute(browser, { width: 1280, height: 800 }, { reducedMotion: "reduce" });
    try {
      await page.waitForTimeout(1000);
      assert.equal(await page.getByRole("heading", { name: "SOURCE VIDEO", exact: true }).count(), 1, "reduced motion does not autoplay");
      const stage = page.locator('[data-spatial-authority="false"]');
      const stack = stage.locator('[style*="--rotation-x"]');
      assert.equal(await stack.evaluate((node) => getComputedStyle(node).transform), "none", "reduced motion removes stack rotation transform");
      const spatialLayer = stage.locator('[style*="--layer-color"]').first();
      assert.equal(await spatialLayer.evaluate((node) => getComputedStyle(node).transitionDuration), "0s", "reduced motion removes depth transition timing");
      await page.getByRole("button", { name: "▶ PLAY 1→7 STORY", exact: true }).click();
      await page.waitForTimeout(930);
      assert.equal(await page.getByRole("heading", { name: "MOMENT CUT", exact: true }).count(), 1, "explicit story playback still advances semantic state");
      assert.equal(errors.length, 0, `reduced motion has no page/console errors: ${errors.join(" | ")}`);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("Memory Anatomy — 200% zoom-equivalent reflow keeps controls reachable", { timeout: 30000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    // A 1280px physical viewport at 200% browser zoom exposes roughly 640 CSS px to responsive layout.
    const { page, errors } = await openRoute(browser, { width: 640, height: 800 });
    try {
      await assertSevenAccessibleLayers(page, "1280@200%-equivalent/640css");
      await assertNoHorizontalOverflow(page, "1280@200%-equivalent/640css");
      await assertPanelsFitViewport(page, "1280@200%-equivalent/640css");
      assert.equal(errors.length, 0, `200% equivalent reflow has no page/console errors: ${errors.join(" | ")}`);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
