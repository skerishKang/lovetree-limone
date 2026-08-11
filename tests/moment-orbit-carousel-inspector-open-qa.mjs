import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://127.0.0.1:3000";
const URL = `${BASE}/design-lab/capabilities/moment-orbit-carousel`;
const SCREENSHOT_DIR = process.env.MOMENT_ORBIT_SCREENSHOT_DIR || "test-results/moment-orbit-carousel";
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

test("Moment Orbit Carousel candidate — 390x844 inspector-open evidence", { timeout: 30000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = [];
    page.on("pageerror", (error) => errors.push(`page:${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console:${message.text()}`);
    });

    const response = await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    assert.ok(response?.ok(), `candidate route HTTP ${response?.status()}`);
    await page.locator(".lt-moc").waitFor({ timeout: 15000 });

    const auto = page.getByRole("button", { name: /AUTO ·/ });
    if ((await page.locator(".lt-moc").getAttribute("data-autoplay")) === "on") await auto.click();

    await page.locator(".lt-moc__shelf button").first().scrollIntoViewIfNeeded();
    await page.locator(".lt-moc__shelf button").first().click();
    await page.waitForFunction(() => document.querySelector(".lt-moc")?.getAttribute("data-selected-index") === "0");

    await page.getByRole("button", { name: /SELECTED MOMENT ·/ }).click();
    const inspector = page.locator(".lt-moc__inspector.is-open");
    await inspector.waitFor();
    await page.waitForFunction(() => {
      const panel = document.querySelector(".lt-moc__inspector.is-open");
      if (!(panel instanceof HTMLElement)) return false;
      const box = panel.getBoundingClientRect();
      return box.left >= -1 && box.top >= -1 && box.right <= window.innerWidth + 1 && box.bottom <= window.innerHeight + 1;
    });

    const inspectorBox = await inspector.boundingBox();
    assert.ok(inspectorBox, "inspector-open: panel has geometry");
    assert.ok(inspectorBox.x >= -1, `inspector-open: left edge ${inspectorBox.x}`);
    assert.ok(inspectorBox.y >= -1, `inspector-open: top edge ${inspectorBox.y}`);
    assert.ok(inspectorBox.x + inspectorBox.width <= 391, `inspector-open: right edge ${inspectorBox.x + inspectorBox.width}`);
    assert.ok(inspectorBox.y + inspectorBox.height <= 845, `inspector-open: bottom edge ${inspectorBox.y + inspectorBox.height}`);

    const close = page.getByRole("button", { name: "CLOSE" });
    assert.equal(await close.isVisible(), true, "inspector-open: close is visible");
    assert.equal(await page.locator(".lt-moc__backdrop.is-open").count(), 1, "inspector-open: background overlay is active");
    assert.equal(await inspector.getAttribute("aria-modal"), "true", "inspector-open: mobile dialog is modal");
    assert.equal(await inspector.getAttribute("data-media-type"), "video", "inspector-open: selected Moment exposes video region");
    assert.equal(await inspector.locator("video").count(), 1, "inspector-open: exactly one selected video element");

    const mediaBox = await inspector.locator(".lt-moc__inspector-media").boundingBox();
    assert.ok(mediaBox, "inspector-open: selected media has geometry");
    assert.ok(mediaBox.y >= -1 && mediaBox.y < 844, "inspector-open: selected media begins inside viewport");
    assert.ok(mediaBox.x >= -1 && mediaBox.x + mediaBox.width <= 391, "inspector-open: selected media is not horizontally clipped");

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `inspector-open: horizontal overflow ${overflow}px`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile-390x844-inspector-open.png") });

    const sound = page.getByRole("button", { name: "SELECTED MEDIA SOUND · OFF" });
    await sound.scrollIntoViewIfNeeded();
    assert.equal(await sound.isVisible(), true, "inspector-open: selected-media control is reachable");
    assert.equal(errors.length, 0, `inspector-open: no page/console errors: ${errors.join(" | ")}`);
  } finally {
    await browser.close();
  }
});
