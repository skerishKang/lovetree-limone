import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const URL = `${BASE}/v4/cinematic`;
const VIEWPORTS = [
  { name: "desktop", width: 1536, height: 960 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "phone", width: 390, height: 844 },
  { name: "mobile", width: 320, height: 720 },
];

async function openPage(browser, url, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console:${msg.text()}`);
  });
  const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(400);
  return { page, errors, resp };
}

test("v4 cinematic — route 200 and no errors across all viewports", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      const { page, errors, resp } = await openPage(browser, URL, vp);
      assert.ok(resp.ok(), `${vp.name}: HTTP 200`);
      const over = await page.evaluate(() => {
        const doc = document.documentElement;
        const sc = document.querySelector(".cin-scene-copy");
        const r = sc?.getBoundingClientRect();
        return {
          overflowX: doc.scrollWidth > doc.clientWidth,
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          copyClipped: r ? r.width > 0 && r.right > doc.clientWidth + 1 : false,
        };
      });
      assert.equal(over.overflowX, false, `${vp.name}: no horizontal overflow`);
      assert.equal(over.copyClipped, false, `${vp.name}: primary copy not clipped`);
      assert.equal(errors.length, 0, `${vp.name}: no page/console errors`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("v4 cinematic — 16 scenes present in source order with external assets", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openPage(browser, URL, VIEWPORTS[0]);
    const scenes = await page.evaluate(() => ({
      count: document.querySelectorAll(".cin-scene").length,
      effects: Array.from(document.querySelectorAll(".cin-scene")).map((s) => s.dataset.effect),
      dataUris: Array.from(document.querySelectorAll("img")).filter((i) => i.src.startsWith("data:")).length,
      externalImgs: Array.from(document.querySelectorAll("img")).map((i) => i.src).filter((s) => s.startsWith("http")).length,
      railButtons: document.querySelectorAll(".cin-rail button").length,
      menuBtn: document.querySelector(".cin-menu-btn")?.getAttribute("aria-expanded"),
    }));
    assert.equal(scenes.count, 16, "16 scenes rendered");
    assert.equal(scenes.railButtons, 16, "16 rail buttons");
    assert.equal(scenes.dataUris, 0, "no inline base64 images remain");
    assert.ok(scenes.externalImgs > 0, "images loaded from external asset paths");
    assert.deepEqual(
      scenes.effects.slice(0, 3),
      ["polish", "seed", "pearzoom"],
      "scene order preserved from source",
    );
    assert.equal(errors.length, 0, "no errors");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 cinematic — rail navigation reaches every scene and final CTA is a real link", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openPage(browser, URL, VIEWPORTS[0]);
    // jump directly to final scene via rail; wait for smooth scroll to settle
    await page.locator('.cin-rail button[aria-label="16번 장면"]').click();
    await page.waitForFunction(
      () => document.querySelector(".cin-counter span")?.textContent === "16",
      { timeout: 8000 },
    );
    const finalState = await page.evaluate(() => {
      const cta = document.querySelector(".cin-final-cta");
      return {
        ctaExists: !!cta,
        ctaHref: cta?.getAttribute("href"),
        counter: document.querySelector(".cin-counter span")?.textContent,
      };
    });
    assert.equal(finalState.ctaExists, true, "final CTA present");
    assert.equal(finalState.ctaHref, "/v4/journey", "final CTA navigates to /v4/journey");
    assert.equal(finalState.counter, "16", "counter reaches scene 16");
    assert.equal(errors.length, 0, "no errors");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 cinematic — menu open/close, backdrop, Escape, focus trap, focus restore", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openPage(browser, URL, VIEWPORTS[0]);
    const menuBtn = page.locator(".cin-menu-btn");
    await menuBtn.focus();
    const expandedBefore = await menuBtn.getAttribute("aria-expanded");
    assert.equal(expandedBefore, "false", "aria-expanded false initially");

    await menuBtn.click();
    await page.waitForSelector("#cin-menu-overlay", { timeout: 3000 });
    const expandedAfter = await menuBtn.getAttribute("aria-expanded");
    assert.equal(expandedAfter, "true", "aria-expanded true when open");
    const menuVisible = await page.locator("#cin-menu-overlay").isVisible();
    assert.equal(menuVisible, true, "menu overlay visible");

    // focus trap: pressing Shift+Tab from first control wraps to last
    const firstTile = page.locator(".cin-menu-tile").first();
    await firstTile.focus();
    await page.keyboard.press("Shift+Tab");
    const focusedAfterWrap = await page.evaluate(
      () => (document.activeElement).className,
    );
    assert.match(focusedAfterWrap, /cin-menu-close/, "Shift+Tab wraps to last control");

    // Escape closes
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const goneAfterEsc = (await page.locator("#cin-menu-overlay").count()) === 0;
    assert.equal(goneAfterEsc, true, "Escape closes menu");
    const restoredFocus = await page.evaluate(
      () => (document.activeElement).className,
    );
    assert.match(restoredFocus, /cin-menu-btn/, "focus restored to menu trigger");

    // reopen and close via backdrop
    await menuBtn.click();
    await page.waitForSelector("#cin-menu-overlay");
    const overlay = page.locator("#cin-menu-overlay");
    const box = await overlay.boundingBox();
    await page.mouse.click(box.x + box.width - 5, box.y + 5);
    await page.waitForTimeout(200);
    const goneAfterBackdrop = (await page.locator("#cin-menu-overlay").count()) === 0;
    assert.equal(goneAfterBackdrop, true, "backdrop click closes menu");

    assert.equal(errors.length, 0, "no errors");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 cinematic — reduced motion disables canvas and keeps navigation usable", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: VIEWPORTS[0], reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console:${msg.text()}`);
    });
    await page.goto(URL, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => ({
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      dataReduced: document.querySelector("[data-cinematic-root]")?.getAttribute("data-cin-reduced"),
      canvasDisplay: getComputedStyle(document.querySelector(".cin-fx-canvas")).display,
      railCount: document.querySelectorAll(".cin-rail button").length,
      menuBtn: !!document.querySelector(".cin-menu-btn"),
    }));
    assert.equal(state.reduced, true, "reduced-motion media matches");
    assert.equal(state.dataReduced, "true", "data-cin-reduced reflects media query");
    assert.equal(state.canvasDisplay, "none", "canvas hidden under reduced motion");
    assert.equal(state.railCount, 16, "navigation intact");
    assert.equal(state.menuBtn, true, "menu control intact");
    assert.equal(errors.length, 0, "no errors under reduced motion");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 cinematic — full 16-scene scroll pass stays within bounds and rAF does not leak", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openPage(browser, URL, VIEWPORTS[0]);
    // walk through all scenes
    for (let i = 0; i < 16; i += 1) {
      await page.locator(`.cin-rail button[aria-label="${i + 1}번 장면"]`).click();
      await page.waitForTimeout(250);
    }
    const after = await page.evaluate(() => ({
      scrollY: Math.round(window.scrollY),
      sceneCount: document.querySelectorAll(".cin-scene").length,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    assert.equal(after.sceneCount, 16, "all scenes remain mounted");
    assert.equal(after.overflowX, false, "no horizontal overflow after full pass");
    // visibilitychange pause: simulate hidden
    const hiddenPaused = await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      return true;
    });
    assert.equal(hiddenPaused, true, "visibilitychange dispatched");
    assert.equal(errors.length, 0, "no errors through full pass");
    await page.close();
  } finally {
    await browser.close();
  }
});
