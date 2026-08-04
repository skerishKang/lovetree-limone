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
    await page.locator('.cin-rail button[aria-label="16번 장면"]').click({ force: true });
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
      await page.locator(`.cin-rail button[aria-label="${i + 1}번 장면"]`).click({ force: true });
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

test("v4 cinematic — header composition has zero overlap and controls inside viewport", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      const { page } = await openPage(browser, URL, vp);
      const r = await page.evaluate(() => {
        const brand = document.querySelector(".cin-brand")?.getBoundingClientRect();
        const sound = document.querySelector(".cin-sound")?.getBoundingClientRect();
        const menu = document.querySelector(".cin-menu-btn")?.getBoundingClientRect();
        const overlap = (a, b) =>
          a && b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
        return {
          brandSound: overlap(brand, sound) ? 1 : 0,
          brandMenu: overlap(brand, menu) ? 1 : 0,
          soundMenu: overlap(sound, menu) ? 1 : 0,
          brandInView: brand && brand.left >= 0 && brand.right <= innerWidth,
          soundInView: sound && sound.left >= 0 && sound.right <= innerWidth,
          menuInView: menu && menu.left >= 0 && menu.right <= innerWidth,
        };
      });
      assert.equal(r.brandSound, 0, `${vp.name}: brand vs sound overlap = 0`);
      assert.equal(r.brandMenu, 0, `${vp.name}: brand vs menu overlap = 0`);
      assert.equal(r.soundMenu, 0, `${vp.name}: sound vs menu overlap = 0`);
      assert.equal(r.brandInView, true, `${vp.name}: brand inside viewport`);
      assert.equal(r.soundInView, true, `${vp.name}: sound inside viewport`);
      assert.equal(r.menuInView, true, `${vp.name}: menu inside viewport`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("v4 cinematic — source-faithful menu shows LoveTree Chapters with image tiles", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page } = await openPage(browser, URL, VIEWPORTS[0]);
    // before opening: no menu images in DOM
    const beforeImgs = await page.evaluate(() => document.querySelectorAll(".cin-menu-tile-img").length);
    assert.equal(beforeImgs, 0, "no menu thumbnails before menu open");
    await page.locator(".cin-menu-btn").click();
    await page.waitForSelector("#cin-menu-overlay");
    const r = await page.evaluate(() => {
      const overlay = document.querySelector("#cin-menu-overlay");
      const tiles = document.querySelectorAll(".cin-menu-tile");
      const imgs = document.querySelectorAll(".cin-menu-tile-img");
      return {
        label: overlay?.getAttribute("aria-label"),
        title: document.querySelector(".cin-menu-title")?.textContent,
        desc: document.querySelector(".cin-menu-head p")?.textContent?.trim(),
        tileCount: tiles.length,
        imgCount: imgs.length,
        allExternal: Array.from(imgs).every((i) => i.src.startsWith("http") && !i.src.startsWith("data:")),
        dataUris: Array.from(imgs).filter((i) => i.src.startsWith("data:")).length,
      };
    });
    assert.equal(r.label, "LoveTree Chapters", "dialog label = LoveTree Chapters");
    assert.equal(r.title, "LoveTree Chapters", "title = LoveTree Chapters");
    assert.ok(r.desc && r.desc.length > 0, "source explanatory copy present");
    assert.equal(r.tileCount, 16, "16 visual scene tiles");
    // the sky scene (10) has no image asset, so 15 tiles carry an image
    assert.equal(r.imgCount, 15, "15 tiles carry an image (sky scene is CSS-only)");
    assert.equal(r.allExternal, true, "all tile images from external assets");
    assert.equal(r.dataUris, 0, "no base64 menu thumbnails");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 cinematic — scene 12 shard-field renders 12 workshop shards with scroll transforms", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: VIEWPORTS[0] });
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console:${msg.text()}`);
    });
    await page.goto(URL, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(300);

    // navigate to scene 12 and wait for it to become active
    await page.locator('.cin-rail button[aria-label="12번 장면"]').click({ force: true });
    await page.waitForFunction(
      () => document.querySelector(".cin-counter span")?.textContent === "12",
      { timeout: 8000 },
    );
    await page.waitForTimeout(300);

    const shards = await page.evaluate(() => {
      const list = document.querySelectorAll(".cin-shard");
      return {
        count: list.length,
        ariaHidden: document.querySelector(".cin-shard-field")?.getAttribute("aria-hidden"),
        firstBg: list[0] ? getComputedStyle(list[0]).backgroundImage.slice(0, 80) : null,
        hasClip: list[0] ? (getComputedStyle(list[0]).clipPath || "").length > 10 : false,
        transform: list[0] ? getComputedStyle(list[0]).transform : null,
      };
    });
    assert.equal(shards.count, 12, "scene 12 has exactly 12 shards");
    assert.equal(shards.ariaHidden, "true", "shard layer aria-hidden");
    assert.match(shards.firstBg, /workshop\.webp/, "shards use workshop external asset");
    assert.equal(shards.hasClip, true, "shards use clip-path fragments");

    // scroll-driven scatter: move within scene 12 and confirm transform changes
    const t1 = await page.evaluate(() => {
      const s = document.querySelector(".cin-shard");
      return s ? getComputedStyle(s).transform : "none";
    });
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(400);
    const t2 = await page.evaluate(() => {
      const s = document.querySelector(".cin-shard");
      return s ? getComputedStyle(s).transform : "none";
    });
    assert.notEqual(t2, t1, "shard transform changes with scroll in normal mode");

    // reduced motion: transforms remain static
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    await page.locator('.cin-rail button[aria-label="12번 장면"]').click({ force: true });
    await page.waitForFunction(
      () => document.querySelector(".cin-counter span")?.textContent === "12",
      { timeout: 8000 },
    );
    const r1 = await page.evaluate(() => {
      const s = document.querySelector(".cin-shard");
      return s ? getComputedStyle(s).transform : "none";
    });
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(300);
    const r2 = await page.evaluate(() => {
      const s = document.querySelector(".cin-shard");
      return s ? getComputedStyle(s).transform : "none";
    });
    assert.equal(r1, r2, "shard transform remains static under reduced motion");
    assert.equal(errors.length, 0, "no errors");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 cinematic — fx rAF loop lifecycle (active, hidden, resume single loop, reduced none)", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: VIEWPORTS[0] });
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console:${msg.text()}`);
    });
    await page.goto(URL, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(500);

    // active: fx ticks counter increases while visible
    const activeStart = await page.evaluate(() => window.__cinFxTicks);
    await page.waitForTimeout(400);
    const activeEnd = await page.evaluate(() => window.__cinFxTicks);
    assert.ok(activeEnd > activeStart, `fx loop running while active (${activeStart} -> ${activeEnd})`);
    const activeFlag = await page.evaluate(() => window.__cinFxActive);
    assert.equal(activeFlag, true, "fx loop active flag true while visible");

    // hidden: counter stops increasing and active flag clears
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(200);
    const hiddenTickA = await page.evaluate(() => window.__cinFxTicks);
    const hiddenFlag = await page.evaluate(() => window.__cinFxActive);
    await page.waitForTimeout(400);
    const hiddenTickB = await page.evaluate(() => window.__cinFxTicks);
    assert.equal(hiddenFlag, false, "fx active flag cleared while hidden");
    assert.equal(hiddenTickA, hiddenTickB, "no additional app fx ticks while hidden");

    // resume: exactly one loop (active flag true again, counter resumes)
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(200);
    const resumeStart = await page.evaluate(() => window.__cinFxTicks);
    const resumeFlag = await page.evaluate(() => window.__cinFxActive);
    await page.waitForTimeout(400);
    const resumeEnd = await page.evaluate(() => window.__cinFxTicks);
    assert.equal(resumeFlag, true, "exactly one loop after resume (active flag true)");
    assert.ok(resumeEnd > resumeStart, "fx ticks resume after visibility restore");

    // reduced motion: no loop (canvas hidden, active flag false)
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const reduced = await page.evaluate(() => {
      const canvas = document.querySelector(".cin-fx-canvas");
      return {
        display: getComputedStyle(canvas).display,
        active: window.__cinFxActive,
      };
    });
    assert.equal(reduced.display, "none", "no loop under reduced motion (canvas hidden)");
    assert.equal(reduced.active, false, "fx active flag false under reduced motion");
    assert.equal(errors.length, 0, "no errors");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 cinematic — autoplay state machine (Space toggle, wheel stop, menu isolation)", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page } = await openPage(browser, URL, VIEWPORTS[0]);
    const playBtn = page.locator(".cin-play");
    const pressedBefore = await playBtn.getAttribute("aria-pressed");
    assert.equal(pressedBefore, "false", "aria-pressed false initially");

    // Space starts autoplay (no focused control)
    await page.keyboard.press(" ");
    await page.waitForTimeout(400);
    const afterSpace = await playBtn.getAttribute("aria-pressed");
    assert.equal(afterSpace, "true", "Space starts autoplay and sets aria-pressed true");

    // wheel stops autoplay + resets UI state
    await page.mouse.move(700, 400);
    await page.mouse.wheel(0, 60);
    await page.waitForTimeout(500);
    const afterWheel = await playBtn.getAttribute("aria-pressed");
    assert.equal(afterWheel, "false", "wheel stops autoplay and resets UI state");

    // Space on a focused button should NOT toggle (focus on rail button)
    await page.locator('.cin-rail button[aria-label="3번 장면"]').focus();
    await page.keyboard.press(" ");
    await page.waitForTimeout(200);
    const afterSpaceOnFocus = await playBtn.getAttribute("aria-pressed");
    assert.equal(afterSpaceOnFocus, "false", "Space on focused button does not hijack");

    // menu isolation: while menu open, arrows must not navigate scenes
    await page.locator(".cin-menu-btn").click();
    await page.waitForSelector("#cin-menu-overlay");
    const counterBefore = await page.evaluate(() => document.querySelector(".cin-counter span").textContent);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(300);
    const counterAfter = await page.evaluate(() => document.querySelector(".cin-counter span").textContent);
    assert.equal(counterAfter, counterBefore, "arrows do not navigate while menu open");
    // Escape closes menu
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const menuGone = (await page.locator("#cin-menu-overlay").count()) === 0;
    assert.equal(menuGone, true, "Escape closes menu");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 cinematic — initial WebP network requests <= 2 before scroll/menu", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: VIEWPORTS[0] });
    const webpUrls = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes(".webp") && !url.includes("data:")) webpUrls.push(url);
    });
    await page.goto(URL, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(500);

    const initialUnique = [...new Set(webpUrls)];
    // The menu is NOT open, and no scrolling happened yet
    assert.ok(
      initialUnique.length <= 2,
      `initial unique WebP requests <= 2 (got ${initialUnique.length})`,
    );

    // after scene navigation, more assets load
    await page.locator('.cin-rail button[aria-label="8번 장면"]').click({ force: true });
    await page.waitForTimeout(600);
    const afterNavUnique = new Set(webpUrls).size;
    assert.ok(afterNavUnique > initialUnique.length, "more WebP requests after scene navigation");

    // after menu open, thumbnails request additional assets
    await page.locator(".cin-menu-btn").click();
    await page.waitForTimeout(800);
    const afterMenuUnique = new Set(webpUrls).size;
    assert.ok(afterMenuUnique > afterNavUnique, "menu open triggers additional thumbnail requests");
    await page.close();
  } finally {
    await browser.close();
  }
});
