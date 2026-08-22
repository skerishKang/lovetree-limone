// Forensic investigation: Track68 V3.3.2 — 320×720 card count failure
// Targeted reproduction of the CI failure:
//   "A variant has 9 Moment cards in DOM: expected >=9 cards, got 0"
// at viewport 320×720 only (1280×800 and 390×844 pass).

import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const ROUTE = `${BASE}/design-lab/source-tracks/68/v3-3-2/compare`;
const RUNS = parseInt(process.env.FORENSIC_RUNS || "5", 10);

// ── Step 1: Deep 320×720 frame forensics ──
async function forensic320x720(browser, runIndex) {
  console.log(`\n--- 320×720 FORENSIC RUN ${runIndex + 1} ---`);
  const page = await browser.newPage({ viewport: { width: 320, height: 720 } });
  
  const response = await page.goto(ROUTE, { waitUntil: "networkidle", timeout: 45000 });
  console.log(`  HTTP: ${response?.status()}`);

  // Wait for runner ready
  await page.locator("main[data-runner-state]").waitFor({ timeout: 15000 });
  const runnerState = await page.locator("main[data-runner-state]").getAttribute("data-runner-state");
  const runnerMode = await page.locator("main[data-runner-state]").getAttribute("data-mode");
  console.log(`  Runner: state=${runnerState}, mode=${runnerMode}`);

  // Launcher iframe
  await page.locator("iframe[data-source-state='ready']").waitFor({ timeout: 10000 });

  // Before clicking A variant - capture frame state
  const preSwitchFrames = await captureFrameState(page, "pre-A-switch");
  
  // Switch to A variant
  console.log(`  Switching to A variant...`);
  await page.locator("button[aria-pressed]").nth(1).click();
  await page.waitForTimeout(500);
  
  const modeAfterSwitch = await page.locator("main[data-runner-state]").getAttribute("data-mode");
  console.log(`  Mode after switch: ${modeAfterSwitch}`);

  // Wait for iframe ready
  try {
    await page.locator("iframe[data-source-state='ready']").waitFor({ timeout: 10000 });
    console.log(`  iframe[data-source-state='ready'] found`);
  } catch (e) {
    console.log(`  WARNING: iframe ready wait failed: ${e.message.slice(0, 100)}`);
  }

  // Capture ALL frame details
  const postSwitchFrames = await captureFrameState(page, "post-A-switch");
  
  // Wait a bit for iframe content to load
  await page.waitForTimeout(2000);

  // Check document readyState in each frame
  const allFrames = page.frames();
  console.log(`  Total frames: ${allFrames.length}`);
  
  for (let i = 0; i < allFrames.length; i++) {
    const frame = allFrames[i];
    const isMain = frame === page.mainFrame();
    const url = frame.url();
    try {
      const readyState = await frame.evaluate(() => document.readyState);
      const cardCount = await frame.evaluate(() => document.querySelectorAll(".card").length);
      const title = await frame.evaluate(() => document.title || "");
      console.log(`  Frame[${i}] ${isMain ? "MAIN" : "child"} readyState=${readyState} cards=${cardCount} url=${url.slice(0, 80)} title=${title.slice(0, 40)}`);
    } catch (e) {
      console.log(`  Frame[${i}] ${isMain ? "MAIN" : "child"} url=${url.slice(0, 80)} ERROR: ${e.message.slice(0, 60)}`);
    }
  }

  // Check the iframe element's actual attributes
  const iframeInfo = await page.evaluate(() => {
    const iframes = document.querySelectorAll("iframe");
    return Array.from(iframes).map((iframe, i) => ({
      index: i,
      src: iframe.getAttribute("src"),
      dataSourceState: iframe.getAttribute("data-source-state"),
      dataMode: iframe.getAttribute("data-mode"),
      readyState: iframe.contentDocument?.readyState ?? "cross-origin-or-detached",
      display: getComputedStyle(iframe).display,
      visibility: getComputedStyle(iframe).visibility,
      width: iframe.offsetWidth,
      height: iframe.offsetHeight,
    }));
  });
  console.log(`  DOM iframes: ${JSON.stringify(iframeInfo, null, 2).replace(/\n/g, "\n    ")}`);

  // The critical check: resolve frame using the SAME method as the test
  const testFrame = allFrames.find((f) => f !== page.mainFrame());
  if (testFrame) {
    const testCardCount = await testFrame.evaluate(() => document.querySelectorAll(".card").length);
    const testFrameUrl = testFrame.url();
    const testFrameReady = await testFrame.evaluate(() => document.readyState).catch(() => "error");
    console.log(`  TEST'S FRAME SELECTION: url=${testFrameUrl.slice(0, 80)} readyState=${testFrameReady} cards=${testCardCount}`);
  } else {
    console.log(`  TEST'S FRAME SELECTION: NO NON-MAIN FRAME FOUND`);
  }

  // Also check ALL non-main frames for card counts
  const nonMainFrames = allFrames.filter((f) => f !== page.mainFrame());
  console.log(`  Non-main frames: ${nonMainFrames.length}`);
  for (const frame of nonMainFrames) {
    try {
      const cards = await frame.evaluate(() => document.querySelectorAll(".card").length);
      const url = frame.url();
      const readyState = await frame.evaluate(() => document.readyState);
      const mode = await frame.evaluate(() => document.querySelector("main[data-mode]")?.getAttribute("data-mode") || "none").catch(() => "error");
      console.log(`    Frame url=${url.slice(0, 80)} ready=${readyState} cards=${cards} mode=${mode}`);
    } catch(e) {
      console.log(`    Frame url=${frame.url().slice(0, 80)} ERROR: ${e.message.slice(0, 60)}`);
    }
  }

  await page.screenshot({ path: `/tmp/track68-forensic-320x720-run${runIndex}.png` });
  await page.close();
  
  return { nonMainFrames: nonMainFrames.length };
}

async function captureFrameState(page, label) {
  const frames = page.frames();
  const state = [];
  for (const frame of frames) {
    const isMain = frame === page.mainFrame();
    try {
      const readyState = await frame.evaluate(() => document.readyState);
      state.push({ isMain, url: frame.url().slice(0, 80), readyState });
    } catch {
      state.push({ isMain, url: frame.url().slice(0, 80), readyState: "error" });
    }
  }
  console.log(`  ${label}: ${JSON.stringify(state)}`);
  return state;
}

// ── Step 2: Control runs at 390×844 and 1280×800 (focused on A variant cards only) ──
async function controlCardsOnly(browser, vp) {
  console.log(`\n--- CONTROL ${vp.label} (cards check only) ---`);
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  
  await page.goto(ROUTE, { waitUntil: "networkidle", timeout: 45000 });
  await page.locator("main[data-runner-state]").waitFor({ timeout: 15000 });
  await page.locator("iframe[data-source-state='ready']").waitFor({ timeout: 10000 });

  // Switch to A variant
  await page.locator("button[aria-pressed]").nth(1).click();
  await page.waitForTimeout(500);
  await page.locator("iframe[data-source-state='ready']").waitFor({ timeout: 10000 });
  await page.waitForTimeout(2000);

  const allFrames = page.frames();
  const testFrame = allFrames.find((f) => f !== page.mainFrame());
  
  if (testFrame) {
    const cardCount = await testFrame.evaluate(() => document.querySelectorAll(".card").length);
    const url = testFrame.url();
    console.log(`  cards=${cardCount} frameUrl=${url.slice(0, 80)} PASS=${cardCount >= 9 ? "YES" : "NO"}`);
  } else {
    console.log(`  NO CHILD FRAME FOUND`);
  }

  await page.close();
}

// ── Main ──
console.log("Track68 V3.3.2 — 320×720 Forensic Investigation");
console.log(`Base: ${BASE}, Route: ${ROUTE}`);
console.log(`Runs: ${RUNS}`);

const browser = await chromium.launch();

// Run 320×720 forensics multiple times
for (let i = 0; i < RUNS; i++) {
  await forensic320x720(browser, i);
}

// Run controls
await controlCardsOnly(browser, { label: "390x844", width: 390, height: 844 });
await controlCardsOnly(browser, { label: "1280x800", width: 1280, height: 800 });

await browser.close();
console.log("\n=== FORENSIC INVESTIGATION COMPLETE ===");
