import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://127.0.0.1:3000";
const URL = `${BASE}/design-lab/capabilities/moment-orbit-carousel`;
const SCREENSHOT_DIR = process.env.MOMENT_ORBIT_SCREENSHOT_DIR || "test-results/moment-orbit-carousel";
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function screenshotPath(name) {
  return path.join(SCREENSHOT_DIR, `${name}.png`);
}

async function captureErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
  return errors;
}

async function openCandidate(browser, viewport, options = {}) {
  const page = await browser.newPage({ viewport, ...options });
  const errors = await captureErrors(page);
  const response = await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  assert.ok(response?.ok(), `candidate route HTTP ${response?.status()}`);
  await page.locator(".lt-moc").waitFor({ timeout: 15000 });
  await page.waitForTimeout(80);
  return { page, errors };
}

async function selectedIndex(page) {
  return Number(await page.locator(".lt-moc").getAttribute("data-selected-index"));
}

async function waitForSelected(page, index) {
  await page.waitForFunction((expected) => Number(document.querySelector(".lt-moc")?.getAttribute("data-selected-index")) === expected, index);
}

async function assertSelectionSync(page, index, label) {
  assert.equal(await selectedIndex(page), index, `${label}: root selected index`);
  assert.equal(await page.locator(".lt-moc__card.is-selected").getAttribute("data-moment-index"), String(index), `${label}: orbit card selected`);
  assert.equal(await page.locator(".lt-moc__shelf button.is-selected").getAttribute("data-shelf-index"), String(index), `${label}: shelf selected`);
  assert.equal(await page.locator(".lt-moc__inspector").getAttribute("data-selected-id"), `candidate-moment-${String(index + 1).padStart(2, "0")}`, `${label}: inspector selected`);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    stage: (document.querySelector(".lt-moc__stage-panel")?.scrollWidth ?? 0) - (document.querySelector(".lt-moc__stage-panel")?.clientWidth ?? 0),
  }));
  assert.ok(overflow.document <= 1, `${label}: document horizontal overflow ${overflow.document}px`);
  assert.ok(overflow.stage <= 1, `${label}: stage horizontal overflow ${overflow.stage}px`);
}

async function setAuto(page, desired) {
  const root = page.locator(".lt-moc");
  const current = (await root.getAttribute("data-autoplay")) === "on";
  if (current !== desired) await page.getByRole("button", { name: /AUTO ·/ }).click();
  await page.waitForFunction((wanted) => document.querySelector(".lt-moc")?.getAttribute("data-autoplay") === (wanted ? "on" : "off"), desired);
}

async function mouseDragStage(page, deltaX, deltaY = 0) {
  const box = await page.locator(".lt-moc__orbit-stage").boundingBox();
  assert.ok(box, "orbit stage has geometry");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + deltaX, y + deltaY, { steps: 8 });
  await page.mouse.up();
}

async function touchDragStage(page, deltaX, deltaY = 0) {
  const box = await page.locator(".lt-moc__orbit-stage").boundingBox();
  assert.ok(box, "touch stage has geometry");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
  await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + deltaX, y: y + deltaY, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
  await page.waitForTimeout(80);
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await client.detach();
}

test("Moment Orbit Carousel candidate — desktop mechanics and autoplay takeover", { timeout: 60000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openCandidate(browser, { width: 1280, height: 800 });
    try {
      await setAuto(page, false);
      assert.equal(await page.locator(".lt-moc__card").count(), 10, "desktop: ten orbit cards");
      assert.equal(await page.locator(".lt-moc__shelf button").count(), 10, "desktop: ten shelf controls");
      assert.equal(await page.locator(".lt-moc__card video").count(), 0, "desktop: background cards never create playable video elements");
      await assertSelectionSync(page, 0, "desktop initial");
      await assertNoHorizontalOverflow(page, "desktop initial");

      await page.locator(".lt-moc__shelf button").nth(9).click();
      await waitForSelected(page, 9);
      await assertSelectionSync(page, 9, "desktop shelf direct select");

      await page.keyboard.press("ArrowRight");
      await waitForSelected(page, 0);
      await assertSelectionSync(page, 0, "desktop keyboard wrap");

      await page.locator(".lt-moc__orbit-stage").hover();
      await page.mouse.wheel(0, 520);
      await waitForSelected(page, 1);
      await assertSelectionSync(page, 1, "desktop wheel");

      await page.locator(".lt-moc__shelf button").nth(0).click();
      await waitForSelected(page, 0);
      await mouseDragStage(page, -150, 0);
      await waitForSelected(page, 1);
      await assertSelectionSync(page, 1, "desktop drag nearest snap");

      const selectedBeforeAxis = await selectedIndex(page);
      await page.getByRole("button", { name: /AXIS · HORIZONTAL/ }).click();
      assert.equal(await page.locator(".lt-moc").getAttribute("data-axis"), "vertical", "desktop: vertical axis enabled");
      assert.equal(await selectedIndex(page), selectedBeforeAxis, "desktop: axis switch preserves canonical selection");

      await page.locator(".lt-moc__shelf button").nth(0).click();
      await waitForSelected(page, 0);
      assert.equal(await page.locator(".lt-moc__inspector").getAttribute("data-media-type"), "video");
      assert.equal(await page.locator(".lt-moc__inspector video").count(), 1, "desktop: exactly one selected video element");
      assert.equal(await page.locator(".lt-moc__inspector video").evaluate((video) => video.muted), true, "desktop: selected video starts muted");
      await page.getByRole("button", { name: "SELECTED MEDIA SOUND · OFF" }).click();
      assert.equal(await page.locator(".lt-moc__inspector").getAttribute("data-audio-authority"), "selected-unmuted");
      assert.equal(await page.locator(".lt-moc__inspector video").evaluate((video) => video.muted), false, "desktop: selected video alone can unmute");
      assert.equal(await page.locator("video").count(), 1, "desktop: no second video can create simultaneous audio");

      await page.locator(".lt-moc__shelf button").nth(1).click();
      await waitForSelected(page, 1);
      assert.equal(await page.locator(".lt-moc__inspector").getAttribute("data-media-type"), "photo");
      assert.equal(await page.locator(".lt-moc__inspector video").count(), 0, "desktop: photo selection removes selected video element");
      assert.equal(await page.getByRole("button", { name: "PHOTO · NO AUDIO" }).isDisabled(), true);

      await page.locator(".lt-moc__shelf button").nth(0).click();
      await waitForSelected(page, 0);
      await page.getByRole("button", { name: /AXIS · VERTICAL/ }).click();
      await setAuto(page, true);
      await page.waitForTimeout(4300);
      await waitForSelected(page, 1);
      await page.waitForTimeout(3600);
      const stage = page.locator(".lt-moc__orbit-stage");
      const box = await stage.boundingBox();
      assert.ok(box, "desktop autoplay takeover stage geometry");
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.waitForTimeout(1100);
      assert.equal(await selectedIndex(page), 1, "desktop: pending autoplay is suspended while pointer drag is held");
      await page.mouse.move(x - 10, y, { steps: 2 });
      await page.mouse.up();
      assert.equal(await selectedIndex(page), 1, "desktop: sub-step drag snaps to same Moment");
      await page.waitForTimeout(4300);
      await waitForSelected(page, 2);

      await page.screenshot({ path: screenshotPath("desktop-1280x800"), fullPage: true });
      assert.equal(errors.length, 0, `desktop: no page/console errors: ${errors.join(" | ")}`);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("Moment Orbit Carousel candidate — mobile touch, shelf access and inspector focus at 390x844", { timeout: 45000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openCandidate(browser, { width: 390, height: 844 }, { isMobile: true, hasTouch: true });
    try {
      await setAuto(page, false);
      await assertNoHorizontalOverflow(page, "390x844 initial");
      assert.equal(await page.locator(".lt-moc__shelf button").count(), 10);

      const lastShelf = page.locator(".lt-moc__shelf button").nth(9);
      await lastShelf.scrollIntoViewIfNeeded();
      await lastShelf.click();
      await waitForSelected(page, 9);
      await assertSelectionSync(page, 9, "390x844 shelf item 10");

      await page.locator(".lt-moc__shelf button").nth(0).scrollIntoViewIfNeeded();
      await page.locator(".lt-moc__shelf button").nth(0).click();
      await waitForSelected(page, 0);
      await touchDragStage(page, -150, 0);
      await waitForSelected(page, 1);
      await assertSelectionSync(page, 1, "390x844 touch drag snap");

      const opener = page.getByRole("button", { name: /SELECTED MOMENT ·/ });
      await opener.click();
      await page.locator(".lt-moc__inspector.is-open").waitFor();
      assert.equal(await page.locator(".lt-moc__inspector").getAttribute("aria-modal"), "true");
      assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "CLOSE", "390x844: inspector moves focus to close control");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector(".lt-moc__inspector")?.classList.contains("is-open"));
      await page.waitForTimeout(20);
      assert.match(await page.evaluate(() => document.activeElement?.textContent ?? ""), /SELECTED MOMENT/, "390x844: close restores focus to opener");

      await page.locator(".lt-moc__shelf button").nth(0).scrollIntoViewIfNeeded();
      await page.locator(".lt-moc__shelf button").nth(0).click();
      await opener.click();
      assert.equal(await page.locator(".lt-moc__inspector video").count(), 1, "390x844: selected video exists only in inspector");
      await page.getByRole("button", { name: "CLOSE" }).click();

      await assertNoHorizontalOverflow(page, "390x844 final");
      await page.screenshot({ path: screenshotPath("mobile-390x844"), fullPage: true });
      assert.equal(errors.length, 0, `390x844: no page/console errors: ${errors.join(" | ")}`);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("Moment Orbit Carousel candidate — 320x720 keeps all shelf Moments reachable without overflow", { timeout: 30000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openCandidate(browser, { width: 320, height: 720 }, { isMobile: true, hasTouch: true });
    try {
      await setAuto(page, false);
      await assertNoHorizontalOverflow(page, "320x720 initial");
      const lastShelf = page.locator(".lt-moc__shelf button").nth(9);
      await lastShelf.scrollIntoViewIfNeeded();
      await lastShelf.click();
      await waitForSelected(page, 9);
      await assertSelectionSync(page, 9, "320x720 item 10");
      await assertNoHorizontalOverflow(page, "320x720 final");
      await page.screenshot({ path: screenshotPath("mobile-320x720"), fullPage: true });
      assert.equal(errors.length, 0, `320x720: no page/console errors: ${errors.join(" | ")}`);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("Moment Orbit Carousel candidate — reduced motion defaults autoplay off while manual semantics remain", { timeout: 30000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openCandidate(browser, { width: 390, height: 844 }, { isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    try {
      await page.waitForFunction(() => document.querySelector(".lt-moc")?.getAttribute("data-reduced-motion") === "reduce");
      await page.waitForFunction(() => document.querySelector(".lt-moc")?.getAttribute("data-autoplay") === "off");
      assert.equal(await page.locator(".lt-moc__card").first().evaluate((node) => getComputedStyle(node).transitionDuration), "0s", "reduced motion removes card transitions");

      await page.locator(".lt-moc__shelf button").nth(4).scrollIntoViewIfNeeded();
      await page.locator(".lt-moc__shelf button").nth(4).click();
      await waitForSelected(page, 4);
      await page.keyboard.press("ArrowRight");
      await waitForSelected(page, 5);
      await page.getByRole("button", { name: /AXIS · HORIZONTAL/ }).click();
      assert.equal(await page.locator(".lt-moc").getAttribute("data-axis"), "vertical");
      assert.equal(await selectedIndex(page), 5, "reduced motion axis switch preserves selected Moment");
      await page.getByRole("button", { name: /SELECTED MOMENT ·/ }).click();
      await page.locator(".lt-moc__inspector.is-open").waitFor();
      await page.getByRole("button", { name: "CLOSE" }).click();
      await touchDragStage(page, 0, -150);
      await waitForSelected(page, 6);
      await assertNoHorizontalOverflow(page, "reduced motion 390x844");
      await page.screenshot({ path: screenshotPath("reduced-motion-390x844"), fullPage: true });
      assert.equal(errors.length, 0, `reduced motion: no page/console errors: ${errors.join(" | ")}`);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
