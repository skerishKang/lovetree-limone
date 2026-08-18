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

const expectedAssets = [
  ["cyber-01.png", 1943324, "b0f7610585cef166c3fac9224838b5a5a6027795bfc299bc0c4d5563aac1b6b7"],
  ["cyber-02.png", 2138785, "62e998b74cba61a4580844c6f47bffa434b604fc9dba89bfaac14d09cb4f6168"],
  ["cyber-03.png", 2186946, "230b40e23a1238872f406480247e008ee190d13dbf41834d080ff89d3bc34619"],
  ["cyber-04.png", 2131432, "5eff795552a75ac4d09fb2688367c20a191f2d4dcae2ff1891e7634e1a26dcc5"],
  ["cyber-05.png", 1880735, "41971fef71e9851e8aa85929afa644554777558c5313464ba5f434f03e9cbfbc"],
  ["cyber-06.png", 1877218, "bf048941d597ec45e57f12ead8e48746d9c88a3add231fc472fed9c9709173e6"],
  ["cyber-07.png", 1888479, "43a6e22db9cfb104762dcd8ced6d621c1e83e54409c0179e80d2e076c1d0705a"],
  ["cyber-08.png", 1849552, "1b9861583a95c4f0e29f2a1f3ec9992394cb2236ed6979129bd53d55f7b1caf5"],
];
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
async function verifyAssetGatePass(page) {
  for (const [filename, bytes, expectedSha] of expectedAssets) {
    const response = await page.request.get(`${BASE}/design-lab-assets/source-tracks/18/v2/assets/${filename}`);
    assert.equal(response.status(), 200, `${filename} must serve the exact asset`);
    const body = await response.body();
    assert.equal(body.byteLength, bytes, `${filename} served byte length must be exact`);
    assert.equal(createHash("sha256").update(body).digest("hex"), expectedSha, `${filename} served SHA-256 must be exact`);
  }
}
async function acceptViewport(browser, label, viewport, options = {}) {
  const context = await browser.newContext({ viewport, ...options });
  const page = await context.newPage();
  const errors = []; attachErrors(page, errors);
  const response = await page.goto(ROUTE, { waitUntil: "load" });
  assert.ok(response?.ok());
  await verifyExactSource(page);
  await verifyAssetGatePass(page);
  await page.locator('main[data-source-gate="ready"]').waitFor({ timeout: 30000 });
  assert.equal(await page.locator("main").getAttribute("data-asset-gate"), "8/8");
  const launch = page.getByRole("button", { name: /Open verified Fragment Loader/i });

  // open the verified loader (iframe execution only after exact gate)
  await launch.click();
  let frame = page.frameLocator("iframe");
  await frame.locator("#startBtn").waitFor({ timeout: 30000 });
  assert.equal(await page.locator("iframe").count(), 1, "source must execute only after exact gate");
  assert.equal(await frame.locator(".fragment").count(), 20, "20 fragments must render");
  assert.equal(await frame.locator(".identity-cell").count(), 4, "4 portal cells must render");

  // X dismiss + trigger focus restore
  const urlBefore = page.url();
  await frame.locator("#closeBtn").click();
  await page.locator("iframe").waitFor({ state: "detached", timeout: 10000 });
  assert.equal(await page.locator("iframe").count(), 0, "X dismiss must close the loader");
  const active = await page.evaluate(() => document.activeElement?.textContent || "");
  assert.match(active, /Open verified Fragment Loader/, "trigger focus restored after X dismiss");
  assert.equal(page.url(), urlBefore, "X dismiss must not navigate");

  // reopen + Escape dismiss
  await launch.click();
  frame = page.frameLocator("iframe");
  await frame.locator("#startBtn").waitFor({ timeout: 30000 });
  await frame.locator("#startBtn").focus();
  await page.keyboard.press("Escape");
  await page.locator("iframe").waitFor({ state: "detached", timeout: 10000 });
  assert.equal(await page.locator("iframe").count(), 0, "Escape dismiss must close the loader");

  // Enter canonical callback with missing IDs fails closed (no Track17 leak)
  await launch.click();
  frame = page.frameLocator("iframe");
  await frame.locator("#startBtn").waitFor({ timeout: 30000 });
  const enter = frame.locator("#enterBtn");
  assert.equal(await enter.getAttribute("aria-disabled"), "true", "Enter must be disabled without canonical authority");
  const urlPreEnter = page.url();
  await enter.click({ force: true });
  await page.waitForTimeout(500);
  assert.equal(page.url(), urlPreEnter, "Enter with missing IDs must not navigate");
  assert.equal(/17_|track17|\/17\//i.test(page.url()), false, "Track17 navigation leak must be 0");
  await frame.locator("#closeBtn").click();
  await page.locator("iframe").waitFor({ state: "detached", timeout: 10000 });

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
    await acceptViewport(browser, label, viewport, options);
    console.log(`PASS ${label}: exact source verified; 8/8 exact assets served; gate 8/8; execution + X/Escape dismiss + focus restore + fail-closed Enter`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${label}`);
    console.error(error);
  }
}
await browser.close();
console.log(`CHECKS: ${checks.length}, FAILURES: ${failures}, ASSET_GATE: EXACT_8_8_PASS`);
if (failures) process.exit(1);
