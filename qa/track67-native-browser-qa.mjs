// Track67 V2.4.2 native browser QA evidence helper.
//
// Intentionally lives OUTSIDE the standard `tests/*.test.mjs` corpus so it is
// NOT picked up by the shared A-track fail-closed browser inventory. It is run
// only by `.github/workflows/track67-native-browser-qa.yml` (dedicated Track67
// evidence gate). Pure additive QA evidence — no backend/API/DB/Auth changes.
//
// Evidence artifact emitted under qa-artifacts/track67-native/:
//   qa-results.json (+ optional screenshots) for Web CTO review.
//
// The native route exposes bounded QA observability (no fabricated hit):
//   canvas[data-hit-kind]        -> "chunk" | "tail" | "none" (last REAL pointer hit)
// The QA clicks a grid of REAL canvas pixels (the actual pointer pipeline), so
// each hit is computed by the real camera-ray -> ribbon-triangle pipeline, never
// injected. The drawn spiral sits behind/around the forward-facing camera, so a
// chunk is only hittable at some orientations; runHits polls the grid across the
// evolving world until a chunk hit is observed — viewport-independent, no
// narrow-viewport exemption.

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.TRACK67_QA_URL || "http://127.0.0.1:3000";
const URL = `${BASE}/design-lab/lineages/67/v2-4/native`;
const OUT = path.resolve(process.cwd(), "qa-artifacts/track67-native");
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop-1280x800", width: 1280, height: 800, isMobile: false },
  { name: "phone-390x844", width: 390, height: 844, isMobile: true },
  { name: "mobile-320x720", width: 320, height: 720, isMobile: true },
];

const checks = [];
const record = (vp, name, ok, detail = "") => checks.push({ viewport: vp, check: name, pass: ok, detail });

function readHud(page, label) {
  return page.evaluate((lbl) => {
    const divs = Array.from(document.querySelectorAll(".lt67-native__hud div"));
    const div = divs.find((d) => d.textContent && d.textContent.includes(lbl));
    if (!div) return null;
    const strong = div.querySelector("strong");
    return strong ? strong.textContent.trim() : null;
  }, label);
}

function readCanvasDataset(page) {
  return page.evaluate(() => {
    const c = document.querySelector("canvas.lt67-native__canvas");
    if (!c) return null;
    return {
      hitKind: c.dataset.hitKind ?? null,
      tailScreen: c.dataset.tailScreen ?? null,
      chunkScreen: c.dataset.chunkScreen ?? null,
    };
  });
}

async function clickCanvasPixel(page, x, y) {
  const box = await page.locator("canvas.lt67-native__canvas").boundingBox();
  if (!box) throw new Error("canvas boundingBox unavailable");
  await page.mouse.click(box.x + x, box.y + y);
}

async function waitFor(page, fn, timeoutMs, intervalMs = 400) {
  const start = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - start > timeoutMs) return null;
    await page.waitForTimeout(intervalMs);
  }
}

async function scanGridOnce(page) {
  const box = await page.locator("canvas.lt67-native__canvas").boundingBox();
  if (!box) return false;
  const xSteps = 8, ySteps = 12;
  const points = [];
  for (let xi = 0; xi < xSteps; xi += 1) {
    for (let yi = 0; yi < ySteps; yi += 1) {
      points.push([(box.width * (xi + 1.5)) / (xSteps + 1), (box.height * (yi + 1.5)) / (ySteps + 1)]);
    }
  }
  for (const [px, py] of points) {
    await clickCanvasPixel(page, px, py);
    await page.waitForTimeout(40);
    const ds = await readCanvasDataset(page);
    if (ds?.hitKind === "chunk") {
      const inspectVisible = await page.locator(".lt67-native__inspect").count();
      return inspectVisible >= 1;
    }
  }
  return false;
}

async function runHits(page, vp) {
  // Wait until at least one static chunk exists (engine is running).
  const hasChunk = await waitFor(page, async () => {
    const n = parseInt(await readHud(page, "static chunks"), 10);
    return Number.isFinite(n) && n >= 1 ? n : null;
  }, 120000);
  if (!hasChunk) {
    record(vp, "at least one chunk rendered", false, "timed out");
    return;
  }
  record(vp, "at least one chunk rendered", true);

  // The drawn spiral path sits behind / around the forward-facing camera, so a
  // static chunk is only hittable at certain simulation orientations. A single
  // grid scan can land on an unlucky frame — that was the old narrow-viewport
  // failure. Instead, poll the grid of REAL pointer clicks across the evolving
  // world until a chunk hit is observed. This is viewport-independent and uses
  // only real clicks through the actual camera-ray -> ribbon-triangle pipeline,
  // so the narrow-viewport limitation is closed honestly (no exemption, no
  // fabricated hit).
  let foundChunk = false;
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline && !foundChunk) {
    foundChunk = await scanGridOnce(page);
    if (!foundChunk) await page.waitForTimeout(350);
  }
  record(
    vp,
    "static chunk positive hit observable",
    foundChunk,
    foundChunk ? "hit observed via real pointer click (polled grid)" : "no chunk hit across polling window",
  );

  // Close any open inspect dialog
  if (await page.locator(".lt67-native__inspect").count()) {
    await page.getByRole("button", { name: "닫기" }).click().catch(() => {});
    await page.waitForTimeout(100);
  }

  // Empty space -> no hit
  await clickCanvasPixel(page, 2, 2);
  await page.waitForTimeout(100);
  const ds = await readCanvasDataset(page);
  record(vp, "empty-space click -> no hit", ds?.hitKind === "none", `hitKind=${ds?.hitKind}`);
}

async function runWorks(page, vp) {
  const worksCount = await page.locator(".lt67-native__works-item").count();
  record(vp, "WORKS owner set surface present", worksCount >= 1, `items=${worksCount}`);
  // Fail-closed: HOLD/REFERENCE WORKS items must not expose an enabled href.
  const worksOpenCounts = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".lt67-native__works-item"));
    let holdRefDisabled = 0;
    let holdRefTotal = 0;
    let enabledHrefCount = 0;
    for (const item of items) {
      const badge = item.querySelector(".lt67-native__badge");
      const badgeText = badge?.textContent?.trim() ?? "";
      const isHoldRef = badgeText === "HOLD" || badgeText === "REFERENCE";
      if (isHoldRef) {
        holdRefTotal += 1;
        const btn = item.querySelector("button.lt67-native__works-open");
        if (btn && btn.disabled) holdRefDisabled += 1;
      } else {
        const a = item.querySelector("a.lt67-native__works-open");
        if (a && a.getAttribute("href")) enabledHrefCount += 1;
      }
    }
    return { holdRefTotal, holdRefDisabled, enabledHrefCount };
  });
  record(
    vp,
    "WORKS fail-closed (HOLD/REFERENCE have disabled button, ENABLED/STABLE have href)",
    worksOpenCounts.holdRefTotal === worksOpenCounts.holdRefDisabled && worksOpenCounts.enabledHrefCount >= 1,
    JSON.stringify(worksOpenCounts),
  );
}

async function runOverflowErrors(page, vp, errors) {
  const overflow = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  );
  record(vp, "horizontal overflow 0", overflow === 0, `overflow px: ${overflow}`);
  record(vp, "console error 0", errors.console.length === 0, errors.console.slice(0, 3).join(" | "));
  record(vp, "page error 0", errors.page.length === 0, errors.page.slice(0, 3).join(" | "));
}

async function runPersistence(page, vp) {
  const reached = await waitFor(
    page,
    async () => {
      const n = parseInt(await readHud(page, "static chunks"), 10);
      return Number.isFinite(n) && n > 112 ? n : null;
    },
    300000,
  );
  record(vp, "static chunks exceed 112 (persistent, no eviction cap)", reached !== null, `chunks=${reached}`);
}

async function runRewind(page, vp) {
  // Fresh, paused state with a small history so origin is reachable in-browser.
  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator("canvas.lt67-native__canvas").waitFor({ timeout: 15000 });
  await waitFor(page, async () => (parseInt(await readHud(page, "static chunks"), 10) >= 1 ? true : null), 120000);
  // Pause autoplay so rewind is not fighting forward simulation.
  const pauseBtn = page.getByRole("button", { name: /일시정지/ });
  if (await pauseBtn.count()) await pauseBtn.click();
  await page.locator("canvas.lt67-native__canvas").focus();

  const t0 = parseInt(await readHud(page, "travel"), 10) || 0;
  let reachedOrigin = false;
  for (let i = 0; i < 6000; i += 1) {
    await page.keyboard.press("Space");
    if (i % 80 === 79) {
      const t = parseInt(await readHud(page, "travel"), 10) || 0;
      if (t === 0) {
        reachedOrigin = true;
        break;
      }
    }
  }
  const tEnd = parseInt(await readHud(page, "travel"), 10) || 0;
  record(vp, "full-state rewind reaches origin (travel 0)", reachedOrigin || tEnd === 0, `travel ${t0} -> ${tEnd}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // Desktop: full matrix (persistence >112, hits, rewind, works, overflow, errors).
  {
    const vp = VIEWPORTS[0];
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.locator("canvas.lt67-native__canvas").waitFor({ timeout: 15000 });
    record(vp.name, "native Track67 route loads", true);

    await runPersistence(page, vp.name);
    await runHits(page, vp.name);
    await runWorks(page, vp.name);
    await runOverflowErrors(page, vp.name, { console: consoleErrors, page: pageErrors });
    await ctx.close();
  }

  // Mobile + narrow: load, hits, works, overflow, errors (lighter than desktop).
  for (const vp of VIEWPORTS.slice(1)) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.locator("canvas.lt67-native__canvas").waitFor({ timeout: 15000 });
    record(vp.name, "native Track67 route loads", true);

    await runHits(page, vp.name);
    await runWorks(page, vp.name);
    await runOverflowErrors(page, vp.name, { console: consoleErrors, page: pageErrors });
    await ctx.close();
  }

  // Rewind to origin (own context + fresh small history).
  {
    const vp = VIEWPORTS[0];
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => pageErrors.push(e.message));
    await runRewind(page, vp.name);
    record(vp.name, "rewind console error 0", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
    record(vp.name, "rewind page error 0", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
    await ctx.close();
  }

  // Reduced-motion: autoplay blocked, route still renders, no errors.
  {
    const vp = VIEWPORTS[0];
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.locator("canvas.lt67-native__canvas").waitFor({ timeout: 15000 });
    await page.waitForTimeout(3000);
    const chunks = parseInt(await readHud(page, "static chunks"), 10) || 0;
    // Reduced motion must NOT autoplay the simulation.
    record(vp.name, "reduced-motion blocks autoplay (no auto-advanced chunks)", chunks === 0, `chunks=${chunks}`);
    record(vp.name, "reduced-motion route renders", true);
    record(vp.name, "reduced-motion console error 0", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
    record(vp.name, "reduced-motion page error 0", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
    await ctx.close();
  }

  await browser.close();

  const failures = checks.filter((c) => !c.pass).length;
  fs.writeFileSync(
    path.join(OUT, "qa-results.json"),
    JSON.stringify({ summary: { checks: checks.length, failures }, results: checks }, null, 2),
  );
  console.log(`CHECKS: ${checks.length}, FAILURES: ${failures}`);
  for (const c of checks) console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.viewport}  ${c.check}${c.detail ? "  [" + c.detail + "]" : ""}`);
  if (failures > 0) {
    console.error(`Track67 native QA had ${failures} failures`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
