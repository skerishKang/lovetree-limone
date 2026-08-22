// Final forensic test: Measure exact timing between iframe mount and card availability
// at 320×720 to understand the theoretical race window

import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const ROUTE = `${BASE}/design-lab/source-tracks/68/v3-3-2/compare`;

const RUNS = 10;
const VP = { width: 320, height: 720 };

async function measureTiming(browser, runIndex) {
  const page = await browser.newPage({ viewport: { width: VP.width, height: VP.height } });
  
  await page.goto(ROUTE, { waitUntil: "networkidle", timeout: 45000 });
  await page.locator("main[data-runner-state]").waitFor({ timeout: 15000 });
  await page.locator("iframe[data-source-state='ready']").waitFor({ timeout: 10000 });

  // Switch to A variant and measure timing
  const t0 = performance.now();
  await page.locator("button[aria-pressed]").nth(1).click();
  
  // Poll for cards to appear
  let cardCount = 0;
  let msToCards = 0;
  const deadline = 5000;
  
  // Wait for mode to change first
  await page.waitForFunction(() => {
    const main = document.querySelector("main[data-runner-state]");
    return main && main.getAttribute("data-mode") === "A";
  }, { timeout: 5000 });
  
  const tModeSwitch = performance.now();
  
  // Wait for iframe ready
  await page.locator("iframe[data-source-state='ready']").waitFor({ timeout: 10000 });
  const tIframeReady = performance.now();
  
  // Now poll for cards in the frame
  const frame = page.frames().find((f) => f !== page.mainFrame());
  for (let poll = 0; poll < 50; poll++) {
    cardCount = await frame.evaluate(() => document.querySelectorAll(".card").length);
    if (cardCount >= 9) break;
    await page.waitForTimeout(50);
  }
  const tCards = performance.now();
  
  msToCards = (tCards - tModeSwitch).toFixed(1);
  const msIframeToCards = (tCards - tIframeReady).toFixed(1);
  const msModeToIframe = (tIframeReady - tModeSwitch).toFixed(1);
  
  console.log(`  Run ${runIndex + 1}: mode→iframe=${msModeToIframe}ms iframe→cards=${msIframeToCards}ms total=${msToCards}ms cards=${cardCount}`);
  
  await page.close();
  return { msIframeToCards: parseFloat(msIframeToCards), cards: cardCount };
}

console.log("Track68 — 320×720 timing measurement");
console.log("Measuring: mode switch → iframe ready → cards available\n");

const browser = await chromium.launch();

const results = [];
for (let i = 0; i < RUNS; i++) {
  results.push(await measureTiming(browser, i));
}

await browser.close();

const times = results.map(r => r.msIframeToCards);
const avg = times.reduce((a, b) => a + b, 0) / times.length;
const max = Math.max(...times);
const min = Math.min(...times);

console.log(`\n=== TIMING SUMMARY ===`);
console.log(`iframe-ready → cards: min=${min}ms avg=${avg.toFixed(1)}ms max=${max}ms`);
console.log(`All cards >= 9: ${results.every(r => r.cards >= 9) ? "YES" : "NO"}`);
console.log(`Race window: the test queries cards IMMEDIATELY after iframe[data-source-state='ready']`);
console.log(`On this machine, cards are available within ${max}ms of iframe ready`);
console.log(`On a slower CI runner, this window could be longer`);
