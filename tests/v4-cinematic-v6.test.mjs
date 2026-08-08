import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const URL = `${BASE}/v4/cinematic`;
const SOURCE_SHA = "9a97ce9ee0c0f00fea57add2dbbd55f5d7f50b7ea9cf7d663ca642c879f3d17b";

async function openPage(browser, viewport, options = {}) {
  const page = await browser.newPage({ viewport, ...options });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console:${msg.text()}`);
  });
  const response = await page.goto(URL, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(450);
  assert.ok(response?.ok(), `cinematic route HTTP ${response?.status()}`);
  return { page, errors };
}

test("v4 cinematic v6 — upgrades the existing route without duplicate production routes", () => {
  assert.equal(existsSync("app/v4/cinematic-v6/page.tsx"), false, "no /v4/cinematic-v6 route");
  assert.equal(existsSync("app/v4/cinematic/international/page.tsx"), false, "no /v4/cinematic/international route");
  assert.equal(existsSync("app/v4/labs/cinematic/page.tsx"), false, "no cinematic lab duplicate route");
});

test("v4 cinematic v6 — International source identity and copy are rendered", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openPage(browser, { width: 1280, height: 800 });
    const root = page.locator("[data-cinematic-root]");
    assert.equal(await root.getAttribute("data-cin-v6-edition"), "international");
    assert.equal(await root.getAttribute("data-cin-v6-source"), "lovetree-cinematic-v6-international.html");
    assert.equal(await root.getAttribute("data-cin-v6-source-sha256"), SOURCE_SHA);

    const first = await page.locator('.cin-scene[data-index="0"] .cin-scene-copy').innerText();
    assert.match(first, /OPENING · THE FIRST GLOW/);
    assert.match(first, /A paradise of memory appears at once/);

    const scene2 = page.locator('.cin-rail button[aria-label="2번 장면"]');
    const box2 = await scene2.boundingBox();
    await page.mouse.click(box2.x + box2.width / 2, box2.y + box2.height / 2);
    await page.waitForFunction(() => document.querySelector(".cin-counter span")?.textContent === "02");
    const second = await page.locator('.cin-scene[data-index="1"] .cin-scene-copy').innerText();
    assert.match(second, /Plant\s+the first moment\./);
    assert.match(second, /One small moment is planted first/);

    assert.equal(errors.length, 0, "no page/console errors");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 cinematic v6 — chapter poster/menu copy and direct chapter navigation work", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openPage(browser, { width: 1280, height: 800 });
    await page.locator(".cin-menu-btn").click();
    const panel = page.locator(".cin-menu-panel");
    await panel.waitFor({ state: "visible" });
    assert.equal(await panel.getAttribute("data-cin-v6-menu"), "true");
    assert.match(await page.locator(".cin-menu-head p").innerText(), /Each pear opens a different memory/);
    assert.match(await page.locator(".cin-menu-head small").innerText(), /INTERNATIONAL CINEMATIC/);
    assert.match(await page.locator(".cin-menu-cta").innerText(), /Begin My LoveTree/);

    const posterImage = await panel.evaluate((el) => getComputedStyle(el, "::before").backgroundImage);
    assert.match(posterImage, /a22\.webp/, "v6 chapter poster uses source a22 artwork");

    await page.locator(".cin-menu-tile").nth(11).click();
    await page.waitForFunction(() => document.querySelector(".cin-counter span")?.textContent === "12");
    assert.equal(await page.locator("#cin-menu-overlay").count(), 0, "menu closes after direct chapter jump");
    assert.equal(errors.length, 0, "no page/console errors");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 cinematic v6 — source-backed special scene deltas appear lazily", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openPage(browser, { width: 1280, height: 800 });

    assert.equal(await page.locator(".cin-v6-sky-canopy").count(), 0, "sky canopy not eagerly loaded");
    assert.equal(await page.locator(".cin-v6-alt-growth").count(), 0, "growth alt shot not eagerly loaded");

    const jump = async (scene, expected) => {
      const button = page.locator(`.cin-rail button[aria-label="${scene}번 장면"]`);
      const box = await button.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForFunction(
        (value) => document.querySelector(".cin-counter span")?.textContent === value,
        expected,
        { timeout: 8000 },
      );
      await page.waitForTimeout(180);
    };

    await jump(5, "05");
    assert.equal(await page.locator(".cin-v6-alt-growth").count(), 1, "growth alt shot added on demand");

    await jump(10, "10");
    assert.equal(await page.locator(".cin-v6-sky-canopy img").count(), 2, "v6 sky canopy has two source images");
    assert.match(await page.locator('.cin-scene[data-effect="sky"] .cin-sky-copy').innerText(), /Dates turn memory\s+into a flow/);

    await jump(14, "14");
    assert.equal(await page.locator('.cin-scene[data-effect="questions"] .cin-question-item').count(), 4, "v6 has four question chips");
    assert.match(await page.locator('.cin-scene[data-effect="questions"] .q4').innerText(), /What do you still keep/);
    assert.equal(await page.locator('[data-cin-v6-line="4"]').count(), 2, "fourth question path and endpoint added");

    await jump(15, "15");
    assert.equal(await page.locator(".cin-v6-flash-bloom").count(), 1, "constellation bloom layer added lazily");
    assert.match(await page.locator(".cin-constellation-caption").innerText(), /Every connection\s+becomes a map/);

    await jump(16, "16");
    assert.match(await page.locator(".cin-final-logo").innerText(), /A PRIVATE PARADISE OF MEMORY/);
    assert.match((await page.locator(".cin-final-logo").textContent()) || "", /Your brightest memories grow into a living tree/);
    assert.equal(await page.locator(".cin-final-cta").getAttribute("href"), "/v4/journey", "validated CTA link preserved");
    assert.match(await page.locator(".cin-final-cta").innerText(), /Begin My LoveTree/);

    assert.equal(errors.length, 0, "no page/console errors");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 cinematic v6 — fine pointer produces smoothed depth without taking over scroll", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openPage(browser, { width: 1280, height: 800 });
    const capability = await page.locator("[data-cinematic-root]").getAttribute("data-cin-v6-pointer");
    assert.equal(capability, "enabled", "desktop fine pointer enables v6 pointer response");
    const before = await page.evaluate(() => ({
      scrollY: Math.round(scrollY),
      translate: document.querySelector(".cin-scene-stack")?.style.translate || "",
      ticks: Number(window.__cinV6PointerTicks || 0),
    }));
    await page.mouse.move(1180, 110);
    await page.waitForTimeout(650);
    const after = await page.evaluate(() => ({
      scrollY: Math.round(scrollY),
      translate: document.querySelector(".cin-scene-stack")?.style.translate || "",
      mediaTranslate: document.querySelector(".cin-scene.is-rendering .cin-media")?.style.translate || "",
      ticks: Number(window.__cinV6PointerTicks || 0),
    }));
    assert.equal(after.scrollY, before.scrollY, "pointer motion does not take over scrolling");
    assert.notEqual(after.translate, before.translate, "frame responds to pointer");
    assert.notEqual(after.mediaTranslate, "", "active media receives depth response");
    assert.ok(after.ticks > before.ticks, "pointer smoothing rAF advanced");

    await page.mouse.move(640, 400);
    await page.waitForTimeout(650);
    const reset = await page.evaluate(() => document.querySelector(".cin-scene-stack")?.style.translate || "");
    const resetValues = reset.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
    assert.notEqual(reset, after.translate, "pointer moves back toward neutral center");
    assert.ok(resetValues.length >= 1, "neutral translate remains serializable");
    assert.ok(Math.abs(resetValues[0]) <= 2 && Math.abs(resetValues[1] || 0) <= 2, `pointer residual is near neutral: ${reset}`);
    assert.equal(errors.length, 0, "no page/console errors");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 cinematic v6 — reduced motion disables pointer enhancement while baseline controls remain usable", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console:${msg.text()}`);
    });
    await page.goto(URL, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(450);
    const root = page.locator("[data-cinematic-root]");
    assert.equal(await root.getAttribute("data-cin-v6-pointer"), "disabled");
    assert.equal(await root.getAttribute("data-cin-reduced"), "true");
    await page.mouse.move(1180, 110);
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => ({
      translate: document.querySelector(".cin-scene-stack")?.style.translate || "",
      pointerActive: window.__cinV6PointerActive,
      canvasDisplay: getComputedStyle(document.querySelector(".cin-fx-canvas")).display,
      rail: document.querySelectorAll(".cin-rail button").length,
    }));
    assert.match(state.translate, /^(?:0px(?: 0px)?|)$/);
    assert.equal(state.pointerActive, false, "v6 pointer rAF inactive in reduced motion");
    assert.equal(state.canvasDisplay, "none", "v5.1 reduced-motion canvas contract preserved");
    assert.equal(state.rail, 16, "rail remains usable");
    assert.equal(errors.length, 0, "no page/console errors");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 cinematic v6 — coarse pointer disables pointer-follow", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await page.goto(URL, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(450);
    assert.equal(await page.locator("[data-cinematic-root]").getAttribute("data-cin-v6-pointer"), "disabled");
    const state = await page.evaluate(() => ({
      translate: document.querySelector(".cin-scene-stack")?.style.translate || "",
      active: window.__cinV6PointerActive,
    }));
    assert.match(state.translate, /^(?:0px(?: 0px)?|)$/);
    assert.equal(state.active, false);
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 cinematic v6 — required desktop/mobile viewports have no clipping or horizontal overflow", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
      { width: 320, height: 720 },
    ]) {
      const { page, errors } = await openPage(browser, viewport);
      await page.locator(".cin-menu-btn").click();
      await page.waitForSelector("#cin-menu-overlay");
      const measurements = await page.evaluate(() => {
        const doc = document.documentElement;
        const menu = document.querySelector(".cin-menu-panel")?.getBoundingClientRect();
        const brand = document.querySelector(".cin-brand")?.getBoundingClientRect();
        const menuButton = document.querySelector(".cin-menu-btn")?.getBoundingClientRect();
        return {
          overflow: doc.scrollWidth > doc.clientWidth,
          menuInside: !!menu && menu.left >= -1 && menu.right <= innerWidth + 1,
          brandInside: !!brand && brand.left >= 0 && brand.right <= innerWidth,
          menuButtonInside: !!menuButton && menuButton.left >= 0 && menuButton.right <= innerWidth,
        };
      });
      assert.equal(measurements.overflow, false, `${viewport.width}x${viewport.height}: no horizontal overflow`);
      assert.equal(measurements.menuInside, true, `${viewport.width}x${viewport.height}: menu panel inside viewport`);
      assert.equal(measurements.brandInside, true, `${viewport.width}x${viewport.height}: brand inside viewport`);
      assert.equal(measurements.menuButtonInside, true, `${viewport.width}x${viewport.height}: menu control inside viewport`);
      assert.equal(errors.length, 0, `${viewport.width}x${viewport.height}: no page/console errors`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});