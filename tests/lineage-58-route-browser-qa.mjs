import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { LINEAGE_58_VIDEOFIGURE_ASSETS } from "../lib/lineage-58-videofigure-assets.ts";
import { VIDEOFIGURE_ANGLES } from "../lib/videofigure-turntable.ts";

const BASE = process.env.LOVETREE_QA_BASE_URL || process.env.V4_BASE_URL || "http://127.0.0.1:3000";
const URL = `${BASE}/design-lab/lineages/58/v2`;
const OUTPUT = "test-results/lineage-58-videofigure";

function requireExactAssets() {
  const result = spawnSync(process.execPath, ["scripts/verify-lineage-58-videofigure-assets.mjs"], { encoding: "utf8" });
  assert.equal(
    result.status,
    0,
    `80/80 exact VideoFigure assets are required before browser QA:\n${result.stdout}\n${result.stderr}`,
  );
  assert.match(result.stdout, /LINEAGE_58_VIDEOFIGURE_EXACT_ASSETS_PASS 80\/80/);
}

function captureErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
  return errors;
}

// Bounded conditional-wait standard (#365/#424 kilo methodology): every
// expected state change polls the ACTUAL transition with an explicit
// timeout/polling budget; the original assertions stay verbatim below the
// waits, and a timeout fails loudly with a self-classifying snapshot.
// The autoplay poll loop keeps its own 100ms cadence — that is already good
// bounded polling (per the #424 classification) and is deliberately preserved.
const CONDITION_WAIT = { timeout: 10000, polling: 50 };

async function waitForCondition(page, condition, classify, label, arg = null, wait = CONDITION_WAIT) {
  try {
    await page.waitForFunction(condition, arg, { timeout: wait.timeout, polling: wait.polling });
  } catch (error) {
    const diag = await page.evaluate(classify, arg).catch((diagErr) => ({ diagError: diagErr.message }));
    assert.fail(
      `${label}: condition not met within ${wait.timeout}ms (self-classification: ${JSON.stringify(diag)}) :: ${error.message}`,
    );
  }
}

// Observational stability probe for genuinely temporal contracts: a boolean
// page state must REMAIN true across a bounded window (negative observations
// like "no premature autoplay tick"). Samples the live state instead of
// sleeping; the window length mirrors the original grace envelope and is part
// of the tested contract, not a timeout inflation.
async function expectStateStableFor(page, condition, classify, label, windowMs, arg = null) {
  const deadline = Date.now() + windowMs;
  while (Date.now() < deadline) {
    const ok = await page.evaluate(condition, arg).catch(() => false);
    if (!ok) {
      const diag = await page.evaluate(classify, arg).catch((diagErr) => ({ diagError: diagErr.message }));
      assert.fail(
        `${label}: state flipped during ${windowMs}ms stability window (self-classification: ${JSON.stringify(diag)})`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

const classifyVideofigure = () => {
  const img = document.querySelector(".lt58-videofigure__viewport img");
  return {
    autoPressed: document.querySelector(".lt58-videofigure__actions button")?.getAttribute("aria-pressed") ?? null,
    firstAnglePressed: document.querySelector(".lt58-videofigure__angle-controls > div button")?.getAttribute("aria-pressed") ?? null,
    frame: img?.getAttribute("src")?.split("/").pop() ?? null,
    hint: document.querySelector(".lt58-videofigure__drag-hint")?.textContent ?? null,
    scrollY: Math.round(window.scrollY),
  };
};

const classifyLayout = () => {
  const rect = document.querySelector(".lt58-videofigure__figure-zone")?.getBoundingClientRect();
  return rect
    ? { top: Math.round(rect.top), bottom: Math.round(rect.bottom), w: Math.round(rect.width), h: Math.round(rect.height), scrollY: Math.round(window.scrollY) }
    : null;
};

async function openRoute(browser, viewport, options = {}) {
  const context = await browser.newContext({ viewport, ...options });
  const page = await context.newPage();
  const errors = captureErrors(page);
  const response = await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  assert.ok(response?.ok(), `Lineage 58 route HTTP ${response?.status()}`);
  await page.locator(".lt58-videofigure").waitFor({ timeout: 15000 });
  assert.equal(await page.locator(".lt58-videofigure__gate").getAttribute("data-pass"), "true", "route must explicitly flip the exact asset gate after 80/80 transfer");
  assert.match(await page.locator(".lt58-videofigure__gate strong").innerText(), /80\/80 EXACT ASSET PASS/);
  return { context, page, errors };
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `${label}: horizontal overflow ${overflow}px`);
}

async function assertAllExactAssetsDecode(page, label) {
  const specs = LINEAGE_58_VIDEOFIGURE_ASSETS.map((asset) => ({
    src: `/${asset.targetPath.replace(/^public\//, "")}`,
    filename: asset.filename,
    width: asset.width,
    height: asset.height,
  }));
  const decoded = await page.evaluate(async (items) => Promise.all(items.map((item) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ ...item, ok: true, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight });
    image.onerror = () => resolve({ ...item, ok: false, naturalWidth: 0, naturalHeight: 0 });
    image.src = item.src;
  }))), specs);
  assert.equal(decoded.length, 80, `${label}: all 80 assets tested`);
  for (const item of decoded) {
    assert.equal(item.ok, true, `${label}: ${item.filename} decodes`);
    assert.equal(item.naturalWidth, item.width, `${label}: ${item.filename} width`);
    assert.equal(item.naturalHeight, item.height, `${label}: ${item.filename} height`);
  }
}

async function pauseAutoplay(page) {
  const button = page.locator(".lt58-videofigure__actions button").first();
  if ((await button.getAttribute("aria-pressed")) === "true") await button.click();
  assert.equal(await button.getAttribute("aria-pressed"), "false", "autoplay can be paused deterministically");
}

async function selectLook(page, index) {
  const cards = page.locator(".lt58-videofigure__card");
  await cards.nth(index).click();
  assert.equal(await cards.nth(index).getAttribute("aria-pressed"), "true", `look ${index + 1} becomes canonical selection`);
}

async function selectAngle(page, index) {
  const buttons = page.locator(".lt58-videofigure__angle-controls > div button");
  await buttons.nth(index).click();
  assert.equal(await buttons.nth(index).getAttribute("aria-pressed"), "true", `${VIDEOFIGURE_ANGLES[index]} becomes canonical angle`);
}

async function assertFullSelectionMatrix(page) {
  await pauseAutoplay(page);
  const cards = page.locator(".lt58-videofigure__card");
  assert.equal(await cards.count(), 10, "ten source Look sets are reachable");
  for (let look = 0; look < 10; look += 1) {
    await selectLook(page, look);
    for (let angle = 0; angle < VIDEOFIGURE_ANGLES.length; angle += 1) {
      await selectAngle(page, angle);
      const src = await page.locator(".lt58-videofigure__viewport img").getAttribute("src");
      assert.ok(src?.endsWith(`/${String.fromCharCode(65 + look)}_${VIDEOFIGURE_ANGLES[angle]}.png`), `look ${look + 1} angle ${VIDEOFIGURE_ANGLES[angle]} maps to exact frame`);
    }
  }
}

async function assertSelectionAndProvenance(page) {
  await pauseAutoplay(page);
  await selectLook(page, 5);
  await selectAngle(page, 0);
  assert.equal((await page.locator(".lt58-videofigure__info h2").innerText()).trim(), "BLACK SPARK");
  assert.match(await page.locator(".lt58-videofigure__provenance").innerText(), /moment-f/i);
  assert.match(await page.locator(".lt58-videofigure__provenance").innerText(), /video-53/i);
  assert.ok(await page.locator(".lt58-videofigure__provenance").isVisible(), "source provenance remains visible");

  const zone = await page.locator(".lt58-videofigure__figure-zone").boundingBox();
  assert.ok(zone, "figure zone exists");
  const firstBox = await page.locator(".lt58-videofigure__viewport img").boundingBox();
  assert.ok(firstBox, "first figure renders");

  await selectLook(page, 2);
  await selectAngle(page, 4);
  const secondBox = await page.locator(".lt58-videofigure__viewport img").boundingBox();
  assert.ok(secondBox, "mixed-dimension figure renders");
  assert.ok(firstBox.height > 0 && secondBox.height > 0, "mixed natural dimensions keep a visible normalized viewport");
  assert.ok(secondBox.x >= zone.x - 1 && secondBox.x + secondBox.width <= zone.x + zone.width + 1, "mixed-dimension frame stays inside canonical figure zone");
}

async function assertFilterAndSavedDemo(page) {
  await pauseAutoplay(page);
  await selectLook(page, 0);
  const save = page.locator(".lt58-videofigure__info-actions .is-primary");
  await save.click();
  assert.equal(await save.getAttribute("aria-pressed"), "true", "saved source-demo state is semantic");
  await page.locator(".lt58-videofigure__filters button").filter({ hasText: "SAVED" }).click();
  assert.equal(await page.locator(".lt58-videofigure__card").count(), 1, "saved filter reflects session-local source demo state");
  assert.match(await page.locator(".lt58-videofigure__panel-foot").innerText(), /NON-PERSISTENT/);
  await page.locator(".lt58-videofigure__filters button").filter({ hasText: "ALL" }).click();
}

async function assertAutoplayAndManualTakeover(page) {
  await pauseAutoplay(page);
  await selectLook(page, 0);
  await selectAngle(page, 0);
  const auto = page.locator(".lt58-videofigure__actions button").first();
  await auto.click();
  assert.equal(await auto.getAttribute("aria-pressed"), "true", "autoplay starts explicitly");

  const deadline = Date.now() + 6500;
  let advanced = false;
  while (Date.now() < deadline) {
    const secondSelected = (await page.locator(".lt58-videofigure__card").nth(1).getAttribute("aria-pressed")) === "true";
    const angle000 = (await page.locator(".lt58-videofigure__angle-controls > div button").first().getAttribute("aria-pressed")) === "true";
    if (secondSelected && angle000) { advanced = true; break; }
    await page.waitForTimeout(100);
  }
  assert.equal(advanced, true, "autoplay completes eight angles then advances atomically to the next Look at 000°");

  const zone = page.locator(".lt58-videofigure__figure-zone");
  const box = await zone.boundingBox();
  assert.ok(box, "figure zone exists for drag");
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.52);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.38, box.y + box.height * 0.52, { steps: 6 });
  await page.mouse.up();
  assert.match(await page.locator(".lt58-videofigure__drag-hint").innerText(), /MANUAL AUTHORITY/, "manual drag immediately owns turntable");
  const manualSrc = await page.locator(".lt58-videofigure__viewport img").getAttribute("src");
  // Negative observation (temporal contract, per the #424 classification):
  // after manual drag owns the turntable, the frame must NOT change across a
  // bounded window mirroring the original 450ms grace envelope — observed by
  // sampling instead of sleeping.
  await expectStateStableFor(
    page,
    (src) => document.querySelector(".lt58-videofigure__viewport img")?.getAttribute("src") === src,
    classifyVideofigure,
    "manual takeover prevents premature autoplay tick",
    450,
    manualSrc,
  );
  assert.equal(await page.locator(".lt58-videofigure__viewport img").getAttribute("src"), manualSrc, "manual takeover prevents premature autoplay tick");
  // AUTO resume is an expected completion: observe the hint actually
  // transitioning back to AUTO AUTHORITY instead of sleeping past it.
  await waitForCondition(
    page,
    () => /AUTO AUTHORITY/.test(document.querySelector(".lt58-videofigure__drag-hint")?.textContent ?? ""),
    classifyVideofigure,
    "resume-after-idle restores AUTO authority",
  );
  assert.match(await page.locator(".lt58-videofigure__drag-hint").innerText(), /AUTO AUTHORITY/, "resume-after-idle policy restores autoplay authority");
}

async function assertModalKeyboard(page, usePanelFoot = false) {
  // The top-bar IMPORT trigger is intentionally desktop-only (source CSS hides it <=980px);
  // on mobile the modal is reached through the panel-foot IMPORT button.
  const trigger = usePanelFoot
    ? page.locator(".lt58-videofigure__panel-foot button")
    : page.locator(".lt58-videofigure__actions button").nth(1);
  await trigger.focus();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  const close = dialog.getByRole("button", { name: "닫기" });
  assert.equal(await close.evaluate((node) => document.activeElement === node), true, "modal moves focus to close control");
  await page.keyboard.press("Shift+Tab");
  assert.notEqual(await close.evaluate((node) => document.activeElement === node), true, "Shift+Tab remains inside dialog loop");
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  assert.equal(await trigger.evaluate((node) => document.activeElement === node), true, "Escape restores opener focus");
}

async function dispatchTouchSwipe(context, page, box, from, to) {
  const session = await context.newCDPSession(page);
  const x1 = box.x + box.width * from.x;
  const y1 = box.y + box.height * from.y;
  const x2 = box.x + box.width * to.x;
  const y2 = box.y + box.height * to.y;
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x1, y: y1, radiusX: 4, radiusY: 4, force: 1, id: 1 }] });
  for (let step = 1; step <= 7; step += 1) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x1 + (x2 - x1) * (step / 7), y: y1 + (y2 - y1) * (step / 7), radiusX: 4, radiusY: 4, force: 1, id: 1 }],
    });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function assertMobileTouchAuthority(context, page, label) {
  await pauseAutoplay(page);
  await selectLook(page, 0);
  await selectAngle(page, 0);
  const zone = page.locator(".lt58-videofigure__figure-zone");
  assert.equal(await zone.evaluate((node) => getComputedStyle(node).touchAction), "pan-y", `${label}: vertical page scroll retains CSS touch authority`);
  // Real touch begins where the figure is visible; the look/angle clicks above may have
  // scrolled the zone off-viewport, so bring it back on-screen before measuring/ swiping.
  await zone.scrollIntoViewIfNeeded();
  // Geometry settle: observe the zone visible in the viewport (its top edge
  // at/inside the viewport top, height intact) instead of sleeping a fixed
  // 80ms. scrollIntoViewIfNeeded can leave the top edge sub-pixel above the
  // fold (-0.14px observed), so the contract is visibility, not perfection.
  await waitForCondition(
    page,
    () => {
      const rect = document.querySelector(".lt58-videofigure__figure-zone")?.getBoundingClientRect();
      return Boolean(rect) && rect.top >= -1 && rect.top < window.innerHeight && rect.height > 0;
    },
    classifyLayout,
    `${label}: touch figure zone settled in viewport`,
  );
  const box = await zone.boundingBox();
  assert.ok(box, `${label}: touch figure zone exists`);
  await dispatchTouchSwipe(context, page, box, { x: 0.70, y: 0.50 }, { x: 0.30, y: 0.50 });
  // Angle transition: observe the first angle button actually losing its
  // pressed state instead of sleeping a fixed 80ms.
  await waitForCondition(
    page,
    () => document.querySelector(".lt58-videofigure__angle-controls > div button")?.getAttribute("aria-pressed") !== "true",
    classifyVideofigure,
    `${label}: horizontal touch changes angle`,
  );
  assert.notEqual(await page.locator(".lt58-videofigure__angle-controls > div button").first().getAttribute("aria-pressed"), "true", `${label}: real horizontal touch changes angle`);

  const scrollCapacity = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  if (scrollCapacity > 40) {
    const beforeScroll = await page.evaluate(() => window.scrollY);
    await dispatchTouchSwipe(context, page, box, { x: 0.50, y: 0.74 }, { x: 0.50, y: 0.26 });
    // Vertical scroll transition: observe the page actually scrolling down
    // instead of sleeping a fixed 160ms.
    await waitForCondition(
      page,
      (y) => window.scrollY > y + 4,
      classifyVideofigure,
      `${label}: vertical touch scrolls the page`,
      beforeScroll,
    );
    const afterScroll = await page.evaluate(() => window.scrollY);
    assert.ok(afterScroll > beforeScroll + 4, `${label}: vertical touch remains owned by page scroll`);
  }
  assert.ok(await page.locator(".lt58-videofigure__provenance").isVisible(), `${label}: provenance remains reachable on mobile`);
}

async function assertDecodeErrorFallback(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await page.route("**/A_000.png", (route) => route.abort("failed"));
    const response = await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
    assert.ok(response?.ok(), `decode fallback route HTTP ${response?.status()}`);
    assert.equal(await page.locator(".lt58-videofigure__gate").getAttribute("data-pass"), "true", "decode fallback is tested only after exact transfer gate PASS");
    const hold = page.locator(".lt58-videofigure__asset-hold");
    await hold.waitFor({ timeout: 10000 });
    assert.match(await hold.innerText(), /EXACT SOURCE FRAME HOLD/);
    assert.match(await hold.innerText(), /A_000\.png/);
    assert.match(await hold.innerText(), /Approximate\/generated substitute is intentionally blocked/);
  } finally {
    await context.close();
  }
}

async function assertReducedMotion(browser) {
  const { context, page, errors } = await openRoute(browser, { width: 390, height: 844 }, { reducedMotion: "reduce", isMobile: true, hasTouch: true });
  try {
    const auto = page.locator(".lt58-videofigure__actions button").first();
    // Default-state proof: autoplay must be OFF from mount — observe aria-
    // pressed="false" actually rendering (post-hydration) instead of sleeping
    // a fixed 100ms.
    await waitForCondition(
      page,
      () => document.querySelector(".lt58-videofigure__actions button")?.getAttribute("aria-pressed") === "false",
      classifyVideofigure,
      "reduced motion: autoplay control renders with default OFF state",
    );
    assert.equal(await auto.getAttribute("aria-pressed"), "false", "reduced motion disables automatic 360 by default");
    const animations = await page.evaluate(() => ({
      ring: getComputedStyle(document.querySelector(".lt58-videofigure__ring")).animationName,
    }));
    assert.equal(animations.ring, "none", "reduced motion stops continuous ring animation");
    await selectAngle(page, 2);
    assert.equal(await page.locator(".lt58-videofigure__angle-controls > div button").nth(2).getAttribute("aria-pressed"), "true", "manual angle selection remains available under reduced motion");
    assert.deepEqual(errors, [], `reduced motion: no console/page errors: ${errors.join(" | ")}`);
  } finally {
    await context.close();
  }
}

requireExactAssets();
await mkdir(OUTPUT, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await openRoute(browser, { width: 1280, height: 800 });
  try {
    await assertNoHorizontalOverflow(desktop.page, "1280x800");
    await assertAllExactAssetsDecode(desktop.page, "1280x800");
    await assertFullSelectionMatrix(desktop.page);
    await assertSelectionAndProvenance(desktop.page);
    await assertFilterAndSavedDemo(desktop.page);
    await assertAutoplayAndManualTakeover(desktop.page);
    await assertModalKeyboard(desktop.page);
    await desktop.page.screenshot({ path: `${OUTPUT}/desktop-1280x800.png`, fullPage: true });
    assert.deepEqual(desktop.errors, [], `1280x800: no console/page errors: ${desktop.errors.join(" | ")}`);
  } finally {
    await desktop.context.close();
  }

  for (const spec of [
    { label: "390x844", viewport: { width: 390, height: 844 } },
    { label: "320x720", viewport: { width: 320, height: 720 } },
  ]) {
    const mobile = await openRoute(browser, spec.viewport, { isMobile: true, hasTouch: true });
    try {
      await assertNoHorizontalOverflow(mobile.page, spec.label);
      await assertMobileTouchAuthority(mobile.context, mobile.page, spec.label);
      await assertModalKeyboard(mobile.page, true);
      await mobile.page.screenshot({ path: `${OUTPUT}/mobile-${spec.label}.png`, fullPage: true });
      assert.deepEqual(mobile.errors, [], `${spec.label}: no console/page errors: ${mobile.errors.join(" | ")}`);
    } finally {
      await mobile.context.close();
    }
  }

  await assertDecodeErrorFallback(browser);
  await assertReducedMotion(browser);
  console.log("LINEAGE_58_ROUTE_BROWSER_QA_PASS");
} finally {
  await browser.close();
}
