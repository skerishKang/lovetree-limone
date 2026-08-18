import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://127.0.0.1:3000";
const ROUTE = `${BASE}/design-lab/source-tracks/18/v2/source`;
const SOURCE = `${BASE}/design-lab-assets/source-tracks/18/v2/index.html`;
const SHOTS = process.env.TRACK18_SCREENSHOT_DIR || "/tmp/track18-browser-qa";
const SOURCE_SHA = "680c6ddb8e6ee7c252182f84523d4a66971e96fd6c177b3e72d1e0487b5dabe0";
await mkdir(SHOTS, { recursive: true });

const expectedAssets = ["cyber-01.png","cyber-02.png","cyber-03.png","cyber-04.png","cyber-05.png","cyber-06.png","cyber-07.png","cyber-08.png"];
function attachErrors(page, errors) {
  page.on("pageerror", (error) => errors.push(`pageerror:${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console:${message.text()}`); });
}
async function overflow(page) { return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); }
async function verifyExactSource(page) {
  const response = await page.request.get(SOURCE);
  assert.equal(response.status(), 200);
  const body = await response.body();
  assert.equal(body.byteLength, 25427);
  assert.equal(createHash("sha256").update(body).digest("hex"), SOURCE_SHA);
}
async function verifyAssetHold(page) {
  for (const filename of expectedAssets) {
    const response = await page.request.get(`${BASE}/design-lab-assets/source-tracks/18/v2/assets/${filename}`);
    assert.notEqual(response.status(), 200, `${filename} must not be served by a substitute`);
  }
}
async function holdViewport(browser, label, viewport, options = {}) {
  const context = await browser.newContext({ viewport, ...options });
  const page = await context.newPage();
  const errors = []; attachErrors(page, errors);
  const response = await page.goto(ROUTE, { waitUntil: "load" });
  assert.ok(response?.ok());
  await verifyExactSource(page);
  await verifyAssetHold(page);
  await page.locator('main[data-source-gate="failed"]').waitFor({ timeout: 30000 });
  assert.equal(await page.locator("iframe").count(), 0, "source must never execute while exact assets are missing");
  assert.equal(await page.locator("main").getAttribute("data-asset-gate"), "0/8");
  assert.match(await page.getByRole("alert").innerText(), /FAIL-CLOSED/);
  assert.equal(await overflow(page), 0);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: `${SHOTS}/${label}.png`, fullPage: true });
  await context.close();
}

const browser = await chromium.launch({ headless: true });
const checks = [
  ["desktop-1280x800", { width: 1280, height: 800 }, {}],
  ["mobile-390x844", { width: 390, height: 844 }, { hasTouch: true, isMobile: true }],
  ["mobile-320x720", { width: 320, height: 720 }, { hasTouch: true, isMobile: true }],
  ["reduced-motion-1280x800", { width: 1280, height: 800 }, { reducedMotion: "reduce" }],
];
let failures = 0;
for (const [label, viewport, options] of checks) {
  try {
    await holdViewport(browser, label, viewport, options);
    console.log(`PASS HOLD ${label}: exact source verified; 8 exact assets absent; execution blocked`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${label}`);
    console.error(error);
  }
}
await browser.close();
console.log(`CHECKS: ${checks.length}, FAILURES: ${failures}, ASSET_GATE: EXACT_ASSET_TRANSFER_HOLD`);
if (failures) process.exit(1);
