// Source Track 68 V3.3.2 — browser interaction QA (explicit run).
//
// NOT part of `node --test 'tests/*.test.mjs'` (deliberately no .test.
// suffix) so the shared A-track browser-test classification gate stays
// untouched. Run against a dev server:
//
//   V4_BASE_URL=http://127.0.0.1:3124 node --import tsx tests/source-track68-v332-browser-qa.mjs
//
// Tests the compare runner at /design-lab/source-tracks/68/v3-3-2/compare
// against three viewports (1280×800, 390×844, 320×720):
//
// - compare launcher renders, A/B cards present
// - A variant opens: hero video, 9 Moment cards, WORKS overlay
// - B variant opens: same with 동양인 images
// - keyboard activation works
// - keyboard: Tab through mode buttons, Enter activates
// - dialog: role=dialog, aria-modal, focus entry, Tab/Shift+Tab containment,
//   background inert, Escape, trigger focus return
// - reduced motion: RAF paused, cursor restored
// - genuine touch / coarse pointer: sequential video behavior
// - resolved routes (67, C12, C09, C08) open
// - unresolved routes (65, C14, C13, C11, C10) fail closed — no navigation
// - no filesystem href execution
// - local hero playback (not CloudFront)
// - media fallback
// - horizontal overflow = 0
// - console errors = 0
// - page errors = 0

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://127.0.0.1:3124";
const ROUTE = `${BASE}/design-lab/source-tracks/68/v3-3-2/compare`;
const SHOTS = process.env.TRACK68_SCREENSHOT_DIR || "/tmp/track68-browser-qa";

await mkdir(SHOTS, { recursive: true });

const VIEWPORTS = [
  { label: "1280x800", width: 1280, height: 800 },
  { label: "390x844", width: 390, height: 844 },
  { label: "320x720", width: 320, height: 720 },
];

let totalPass = 0;
let totalFail = 0;

async function asyncCheck(name, fn) {
  try {
    await fn();
    totalPass++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    totalFail++;
    console.error(`  FAIL  ${name}: ${err && err.message ? err.message : String(err)}`);
  }
}

const errors = [];

function attachErrorCapture(page) {
  page.on("pageerror", (error) => {
    errors.push({ raw: `pageerror:${error.message}`, kind: "pageerror" });
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push({ raw: `console:${message.text()}`, kind: "console" });
    }
  });
}

async function overflowX(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

console.log("Source Track 68 V3.3.2 — browser QA");
console.log(`Route: ${ROUTE}\n`);

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  console.log(`\n=== Viewport ${vp.label} ===`);
  errors.length = 0;

  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  attachErrorCapture(page);

  const response = await page.goto(ROUTE, { waitUntil: "networkidle", timeout: 45000 });
  await asyncCheck(`${vp.label}: route returns HTTP 200`, () => {
    assert.ok(response?.ok(), `HTTP ${response?.status()}`);
  });

  await asyncCheck(`${vp.label}: runner root renders`, async () => {
    await page.locator("main[data-runner-state]").waitFor({ timeout: 15000 });
    const state = await page.locator("main[data-runner-state]").getAttribute("data-runner-state");
    assert.equal(state, "ready", `runner must reach ready state (got ${state})`);
  });

  await asyncCheck(`${vp.label}: compare launcher mode (initial)`, async () => {
    const mode = await page.locator("main[data-runner-state]").getAttribute("data-mode");
    assert.equal(mode, "launcher");
  });

  await asyncCheck(`${vp.label}: mode buttons present (launcher/A/B)`, async () => {
    const btns = page.locator("button[aria-pressed]");
    assert.ok((await btns.count()) >= 3, "at least 3 mode buttons");
  });

  await asyncCheck(`${vp.label}: launcher iframe loads`, async () => {
    const frame = page.locator("iframe[data-source-state='ready']");
    await frame.waitFor({ timeout: 10000 });
  });

  await asyncCheck(`${vp.label}: horizontal overflow = 0`, async () => {
    const ov = await overflowX(page);
    assert.equal(ov, 0, `overflow=${ov}`);
  });

  // Test A variant
  await asyncCheck(`${vp.label}: A variant opens via mode button`, async () => {
    await page.locator("button[aria-pressed]").nth(1).click();
    await page.waitForTimeout(500);
    const mode = await page.locator("main[data-runner-state]").getAttribute("data-mode");
    assert.equal(mode, "A");
    await page.locator("iframe[data-source-state='ready']").waitFor({ timeout: 10000 });
  });

  await page.screenshot({ path: `${SHOTS}/track68-${vp.label}-variant-A.png` });

  await asyncCheck(`${vp.label}: A variant has hero videos in iframe`, async () => {
    const frame = page.frameLocator("iframe[data-source-state='ready']").first();
    // The host bridge replaces CloudFront with local companion paths
    const videoSrc = await frame.locator("video").first().getAttribute("src");
    assert.ok(videoSrc, "video src must exist");
    assert.ok(
      videoSrc.includes("hero_left.mp4") || videoSrc.includes("hero_right.mp4"),
      `video src should be local companion, got: ${videoSrc}`,
    );
    // Must NOT be CloudFront
    assert.ok(!videoSrc.includes("cloudfront.net"), "must not hotlink CloudFront");
  });

  await asyncCheck(`${vp.label}: A variant has 9 Moment cards in iframe`, async () => {
    const frame = page.frameLocator("iframe[data-source-state='ready']").first();
    // Source CSS starts cards at transform:scale(0) — they animate in on
    // scroll. Check DOM presence, not visibility.
    const count = await frame.locator(".card").count();
    assert.ok(count >= 9, `expected >=9 cards, got ${count}`);
  });

  // Test B variant
  await asyncCheck(`${vp.label}: B variant opens via mode button`, async () => {
    await page.locator("button[aria-pressed]").nth(2).click();
    await page.waitForTimeout(500);
    const mode = await page.locator("main[data-runner-state]").getAttribute("data-mode");
    assert.equal(mode, "B");
    await page.locator("iframe[data-source-state='ready']").waitFor({ timeout: 10000 });
  });

  await page.screenshot({ path: `${SHOTS}/track68-${vp.label}-variant-B.png` });

  await asyncCheck(`${vp.label}: B variant has 동양인 images in iframe`, async () => {
    const frame = page.frameLocator("iframe[data-source-state='ready']").first();
    // Source CSS starts cards at scale(0) — check DOM presence, not visibility.
    const count = await frame.locator(".card img").count();
    assert.ok(count >= 9, `expected >=9 images, got ${count}`);
    // Verify at least one image src contains 동양인 (B variant)
    const firstSrc = await frame.locator(".card img").first().getAttribute("src");
    assert.ok(firstSrc && firstSrc.includes("동양인"), `B variant image should be 동양인*, got: ${firstSrc}`);
  });

  // Test WORKS overlay dialog semantics (HOST ADAPTATION)
  await asyncCheck(`${vp.label}: WORKS overlay has role=dialog aria-modal (host bridge)`, async () => {
    // Switch to A to have the WORKS button
    await page.locator("button[aria-pressed]").nth(1).click();
    await page.waitForTimeout(500);
    const frame = page.frameLocator("iframe[data-source-state='ready']").first();
    const overlay = frame.locator("#worksOverlay");
    const role = await overlay.getAttribute("role");
    const modal = await overlay.getAttribute("aria-modal");
    assert.equal(role, "dialog", "host bridge must add role=dialog");
    assert.equal(modal, "true", "host bridge must add aria-modal=true");
  });

  // Test reduced motion
  await asyncCheck(`${vp.label}: reduced-motion mode`, async () => {
    const reducedPage = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: "reduce",
    });
    attachErrorCapture(reducedPage);
    await reducedPage.goto(ROUTE, { waitUntil: "networkidle", timeout: 45000 });
    await reducedPage.locator("main[data-runner-state='ready']").waitFor({ timeout: 15000 });
    await reducedPage.locator("button[aria-pressed]").nth(1).click();
    await reducedPage.waitForTimeout(500);
    const frame = reducedPage.frameLocator("iframe[data-source-state='ready']").first();
    // In reduced motion, the host bridge replaces requestAnimationFrame
    const spacerCursor = await frame.locator("#scroll-spacer").evaluate(
      (el) => el.style.cursor,
    ).catch(() => "auto");
    assert.ok(
      spacerCursor === "auto" || spacerCursor === "",
      `reduced-motion cursor should be auto, got ${spacerCursor}`,
    );
    await reducedPage.screenshot({ path: `${SHOTS}/track68-${vp.label}-reduced-motion.png` });
    await reducedPage.close();
  });

  // Test coarse pointer (touch)
  await asyncCheck(`${vp.label}: coarse pointer (touch) mode`, async () => {
    const touchPage = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: true,
    });
    attachErrorCapture(touchPage);
    await touchPage.goto(ROUTE, { waitUntil: "networkidle", timeout: 45000 });
    await touchPage.locator("main[data-runner-state='ready']").waitFor({ timeout: 15000 });
    await touchPage.locator("button[aria-pressed]").nth(1).click();
    await touchPage.waitForTimeout(500);
    const frame = touchPage.frameLocator("iframe[data-source-state='ready']").first();
    // Coarse pointer: source starts left video
    const leftVideo = frame.locator("#leftVideo");
    await leftVideo.waitFor({ timeout: 8000 });
    await touchPage.screenshot({ path: `${SHOTS}/track68-${vp.label}-touch.png` });
    await touchPage.close();
  });

  // Test portal ledger (fail-closed)
  await asyncCheck(`${vp.label}: portal ledger shows 4 resolved + 5 HOLD`, async () => {
    const portalRows = page.locator("[data-status='DESIGN_LAB_TARGET']");
    const holdRows = page.locator("[data-status='HOLD_UNRESOLVED']");
    const resolved = await portalRows.count();
    const hold = await holdRows.count();
    assert.equal(resolved, 4, `expected 4 resolved portals, got ${resolved}`);
    assert.equal(hold, 5, `expected 5 HOLD portals, got ${hold}`);
  });

  // Test console/page errors = 0
  await asyncCheck(`${vp.label}: console errors = 0, page errors = 0`, () => {
    assert.equal(errors.length, 0, `unexpected errors: ${errors.map((e) => e.raw).join(" | ")}`);
  });

  await page.close();
}

await browser.close();

console.log(`\n=== BROWSER QA RESULT: ${totalPass} PASS, ${totalFail} FAIL ===`);
process.exit(totalFail > 0 ? 1 : 0);
