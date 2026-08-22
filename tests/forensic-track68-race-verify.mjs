// Forensic verification: Test the race between data-source-state="ready" and srcdoc content load
// Hypothesis: data-source-state="ready" is set immediately by React, before srcdoc content renders
// This causes a race where cards=0 if queried too early

import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const ROUTE = `${BASE}/design-lab/source-tracks/68/v3-3-2/compare`;

async function testRace(browser, vp, extraWaitMs) {
  const label = `${vp.label} wait=${extraWaitMs}ms`;
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  
  await page.goto(ROUTE, { waitUntil: "networkidle", timeout: 45000 });
  await page.locator("main[data-runner-state]").waitFor({ timeout: 15000 });
  await page.locator("iframe[data-source-state='ready']").waitFor({ timeout: 10000 });

  // Switch to A variant
  await page.locator("button[aria-pressed]").nth(1).click();
  await page.waitForTimeout(500);

  // Wait for iframe ready attribute
  await page.locator("iframe[data-source-state='ready']").waitFor({ timeout: 10000 });

  // Optionally add extra wait for srcdoc content to load
  if (extraWaitMs > 0) {
    await page.waitForTimeout(extraWaitMs);
  }

  // Query cards immediately (same as the test)
  const frame = page.frames().find((f) => f !== page.mainFrame());
  const cardCount = await frame.evaluate(() => document.querySelectorAll(".card").length);
  const readyState = await frame.evaluate(() => document.readyState);
  
  console.log(`  ${label}: cards=${cardCount} readyState=${readyState} PASS=${cardCount >= 9 ? "YES" : "NO"}`);
  
  await page.close();
  return cardCount;
}

console.log("Track68 — Race condition verification");
console.log("Testing: does extra wait after iframe ready affect card count?\n");

const browser = await chromium.launch();

const VP = { label: "320x720", width: 320, height: 720 };
const RUNS = 10;

console.log(`=== ${VP.label} — NO extra wait (like original test) ===`);
let failNoWait = 0;
for (let i = 0; i < RUNS; i++) {
  const count = await testRace(browser, VP, 0);
  if (count < 9) failNoWait++;
}
console.log(`  FAILS: ${failNoWait}/${RUNS}`);

console.log(`\n=== ${VP.label} — 500ms extra wait ===`);
let fail500 = 0;
for (let i = 0; i < RUNS; i++) {
  const count = await testRace(browser, VP, 500);
  if (count < 9) fail500++;
}
console.log(`  FAILS: ${fail500}/${RUNS}`);

console.log(`\n=== ${VP.label} — 1000ms extra wait ===`);
let fail1000 = 0;
for (let i = 0; i < RUNS; i++) {
  const count = await testRace(browser, VP, 1000);
  if (count < 9) fail1000++;
}
console.log(`  FAILS: ${fail1000}/${RUNS}`);

console.log(`\n=== ${VP.label} — 2000ms extra wait ===`);
let fail2000 = 0;
for (let i = 0; i < RUNS; i++) {
  const count = await testRace(browser, VP, 2000);
  if (count < 9) fail2000++;
}
console.log(`  FAILS: ${fail2000}/${RUNS}`);

await browser.close();
console.log("\n=== RACE CONDITION VERIFICATION COMPLETE ===");
console.log(`No wait: ${failNoWait}/${RUNS} fails`);
console.log(`500ms:   ${fail500}/${RUNS} fails`);
console.log(`1000ms:  ${fail1000}/${RUNS} fails`);
console.log(`2000ms:  ${fail2000}/${RUNS} fails`);
