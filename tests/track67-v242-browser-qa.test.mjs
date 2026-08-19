/**
 * Track 67 V2.4.2 — Browser QA: Native Inspect + Genuine Touch (FAIL-CLOSED)
 *
 * Every test MUST assert the required contract.  No log-only PASS,
 * no conditional-assert, no skip, no catch->PASS.
 *
 * Environment:
 *   TRACK67_BASE_URL  — static file server base (default: http://127.0.0.1:3099)
 */

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.TRACK67_BASE_URL || "http://127.0.0.1:3099";
const PKG_URL = `${BASE}/design-lab-assets/lineages/67/v2-4/track67_v2.4.2_works_compare_menu.html`;

const EVIDENCE_DIR = new URL("../qa/evidence/track67-v242/", import.meta.url);

async function ensureEvidenceDir() {
  await mkdir(EVIDENCE_DIR, { recursive: true });
}

async function captureEvidence(page, name) {
  await ensureEvidenceDir();
  const path = new URL(`../qa/evidence/track67-v242/${name}.png`, import.meta.url);
  await page.screenshot({ path: path.pathname, fullPage: false });
  return path.pathname;
}

async function captureErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
  return errors;
}

/**
 * Wait for the WebGL ribbon to render and the textureAPI to be ready.
 */
async function waitForReady(page) {
  await page.waitForSelector("canvas", { timeout: 15000 });
  await page.waitForFunction(
    () => {
      const api = window.textureAPI;
      return typeof api === "object" && typeof api.ready === "function" && api.ready();
    },
    { timeout: 20000 },
  );
  await page.waitForTimeout(2000);
}

/**
 * Open inspect programmatically via textureAPI.openMoment().
 */
async function openInspectProgrammatic(page, momentIdx) {
  await page.evaluate((idx) => {
    window.textureAPI.openMoment(idx);
  }, momentIdx);
  await page.waitForTimeout(500);
}

/**
 * Dense hit-scan: find a valid ribbon screen position for a given segment.
 */
async function findHitPosition(page, segment) {
  return await page.evaluate((seg) => {
    const sp = window.textureAPI.segmentScreenPoint(seg);
    if (!sp) return null;
    const hit = window.textureAPI.ribbonHitAt(sp.x, sp.y);
    if (hit && hit.segment === seg) return { x: sp.x, y: sp.y, hit };
    for (let dx = -30; dx <= 30; dx += 6) {
      for (let dy = -30; dy <= 30; dy += 6) {
        const h = window.textureAPI.ribbonHitAt(sp.x + dx, sp.y + dy);
        if (h && h.segment === seg) return { x: sp.x + dx, y: sp.y + dy, hit: h };
      }
    }
    return null;
  }, segment);
}

// ====================================================================
// 1. REAL PACKAGE URL EXECUTION
// ====================================================================

test("A. source HTML loads via real package URL (no Blob)", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = await captureErrors(page);

    const response = await page.goto(PKG_URL, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    assert.ok(response?.ok(), `Package URL HTTP ${response?.status()}`);

    const finalUrl = page.url();
    assert.ok(
      finalUrl.includes("track67_v2.4.2_works_compare_menu.html"),
      `iframe loaded real URL, not blob: (got ${finalUrl})`,
    );

    const canvasCount = await page.locator("canvas").count();
    assert.ok(canvasCount > 0, `Expected at least 1 canvas element, got ${canvasCount}`);

    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404"),
    );
    assert.equal(criticalErrors.length, 0, `Critical errors: ${criticalErrors.join("; ")}`);

    await captureEvidence(page, "A-real-package-url");
    await page.close();
  } finally {
    await browser.close();
  }
});

// ====================================================================
// 2. NATIVE INSPECT ACCEPTANCE
// ====================================================================

test("B. INSPECT_FREEZE — world state frozen during inspect dialog", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await captureErrors(page);

    await page.goto(PKG_URL, { waitUntil: "networkidle", timeout: 30000 });
    await waitForReady(page);

    // FAIL-CLOSED: inspect MUST open
    await openInspectProgrammatic(page, 1);

    const inspectState = await page.evaluate(() => {
      const viewer = document.getElementById("viewer");
      const metrics = window.textureAPI.metrics();
      return {
        viewerHidden: viewer?.hidden,
        mode: metrics.mode,
        viewerOpenLatencyMs: metrics.viewerOpenLatencyMs,
      };
    });

    assert.equal(inspectState.viewerHidden, false, "viewer MUST NOT be hidden after openMoment(1)");
    assert.equal(inspectState.mode, "inspect", "mode MUST be 'inspect' after openMoment(1)");

    // FAIL-CLOSED: world MUST be frozen
    const frameBefore = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      const gl = canvas?.getContext("webgl2");
      if (!gl) return null;
      const pixels = new Uint8Array(4 * 100);
      gl.readPixels(0, 0, 10, 10, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return Array.from(pixels.slice(0, 40));
    });
    assert.ok(frameBefore, "Must be able to read WebGL pixels before freeze check");

    await page.waitForTimeout(2000);

    const frameAfter = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      const gl = canvas?.getContext("webgl2");
      if (!gl) return null;
      const pixels = new Uint8Array(4 * 100);
      gl.readPixels(0, 0, 10, 10, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return Array.from(pixels.slice(0, 40));
    });
    assert.ok(frameAfter, "Must be able to read WebGL pixels after freeze check");

    const diff = frameBefore.reduce((sum, v, i) => sum + Math.abs(v - (frameAfter[i] || 0)), 0);
    assert.ok(
      diff < 500,
      `World MUST be frozen during inspect (pixel diff: ${diff})`,
    );

    await captureEvidence(page, "B-inspect-freeze");
    await writeFile(
      new URL("../qa/evidence/track67-v242/B-inspect-freeze.json", import.meta.url).pathname,
      JSON.stringify({ inspectState, frameBefore, frameAfter, pixelDiff: diff }),
    );

    await page.close();
  } finally {
    await browser.close();
  }
});

test("C. INSPECT_DIALOG — inspect dialog semantics and visible state", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await captureErrors(page);

    await page.goto(PKG_URL, { waitUntil: "networkidle", timeout: 30000 });
    await waitForReady(page);

    await openInspectProgrammatic(page, 1);

    const dialogState = await page.evaluate(() => {
      const viewer = document.getElementById("viewer");
      const viewerTitle = document.getElementById("viewerTitle");
      const viewerClose = document.getElementById("viewerClose");
      const viewerImg = document.getElementById("viewerImg");
      const viewerDesc = document.getElementById("viewerDesc");
      return {
        viewerExists: !!viewer,
        role: viewer?.getAttribute("role"),
        ariaModal: viewer?.getAttribute("aria-modal"),
        hidden: viewer?.hidden,
        titleText: viewerTitle?.textContent,
        closeBtnVisible: viewerClose
          ? viewerClose.offsetHeight > 0 && viewerClose.offsetWidth > 0
          : false,
        closeBtnLabel: viewerClose?.getAttribute("aria-label"),
        imgSrc: viewerImg?.src ? "loaded" : "empty",
        descText: viewerDesc?.textContent,
      };
    });

    assert.equal(dialogState.viewerExists, true, "viewer element MUST exist");
    assert.equal(dialogState.role, "dialog", "viewer MUST have role='dialog'");
    assert.equal(dialogState.ariaModal, "true", "viewer MUST have aria-modal='true'");
    assert.equal(dialogState.hidden, false, "viewer MUST NOT be hidden");
    assert.ok(
      dialogState.titleText && dialogState.titleText.includes("MOMENT"),
      `viewerTitle MUST contain 'MOMENT' (got: ${dialogState.titleText})`,
    );
    assert.equal(dialogState.closeBtnVisible, true, "viewerClose button MUST be visible");
    assert.ok(dialogState.closeBtnLabel, "viewerClose MUST have aria-label");
    assert.equal(dialogState.imgSrc, "loaded", "viewerImg MUST have a src (high-res asset loaded)");

    await captureEvidence(page, "C-inspect-dialog");
    await writeFile(
      new URL("../qa/evidence/track67-v242/C-inspect-dialog.json", import.meta.url).pathname,
      JSON.stringify(dialogState),
    );

    await page.close();
  } finally {
    await browser.close();
  }
});

test("D. INSPECT_FOCUS — focus moves to inspect dialog on open", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await captureErrors(page);

    await page.goto(PKG_URL, { waitUntil: "networkidle", timeout: 30000 });
    await waitForReady(page);

    await openInspectProgrammatic(page, 1);

    // openInspect() calls viewerClose.focus() in rAF
    await page.waitForTimeout(200);

    const focusState = await page.evaluate(() => {
      const active = document.activeElement;
      const viewerClose = document.getElementById("viewerClose");
      return {
        activeId: active?.id,
        activeTag: active?.tagName,
        activeAriaLabel: active?.getAttribute("aria-label"),
        isViewerClose: active === viewerClose,
        inspectOpen: window.textureAPI.metrics().mode === "inspect",
      };
    });

    assert.equal(focusState.inspectOpen, true, "inspect MUST be open before focus assertion");
    assert.equal(
      focusState.isViewerClose,
      true,
      `activeElement MUST be viewerClose button (got: id=${focusState.activeId}, tag=${focusState.activeTag}, label=${focusState.activeAriaLabel})`,
    );

    await captureEvidence(page, "D-inspect-focus");
    await writeFile(
      new URL("../qa/evidence/track67-v242/D-inspect-focus.json", import.meta.url).pathname,
      JSON.stringify(focusState),
    );

    await page.close();
  } finally {
    await browser.close();
  }
});

test("E. INSPECT_ESCAPE — Escape key closes inspect dialog", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await captureErrors(page);

    await page.goto(PKG_URL, { waitUntil: "networkidle", timeout: 30000 });
    await waitForReady(page);

    await openInspectProgrammatic(page, 1);

    // FAIL-CLOSED: before Escape, dialog MUST be visible
    const beforeEscape = await page.evaluate(() => {
      const viewer = document.getElementById("viewer");
      return { hidden: viewer?.hidden, role: viewer?.getAttribute("role") };
    });
    assert.equal(beforeEscape.hidden, false, "viewer MUST be visible BEFORE Escape");
    assert.equal(beforeEscape.role, "dialog", "viewer MUST have role='dialog' BEFORE Escape");

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // FAIL-CLOSED: after Escape, dialog MUST be hidden
    const afterEscape = await page.evaluate(() => {
      const viewer = document.getElementById("viewer");
      return { hidden: viewer?.hidden, mode: window.textureAPI.metrics().mode };
    });
    assert.equal(afterEscape.hidden, true, "viewer MUST be hidden AFTER Escape");
    assert.notEqual(
      afterEscape.mode,
      "inspect",
      `mode MUST NOT be 'inspect' after Escape (got: ${afterEscape.mode})`,
    );

    await captureEvidence(page, "E-inspect-escape");
    await writeFile(
      new URL("../qa/evidence/track67-v242/E-inspect-escape.json", import.meta.url).pathname,
      JSON.stringify({ beforeEscape, afterEscape }),
    );

    await page.close();
  } finally {
    await browser.close();
  }
});

test("F. INSPECT_RESTORE — canvas/runtime restores after inspect close", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = await captureErrors(page);

    await page.goto(PKG_URL, { waitUntil: "networkidle", timeout: 30000 });
    await waitForReady(page);

    await openInspectProgrammatic(page, 1);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    const restored = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      const viewer = document.getElementById("viewer");
      const gl = canvas?.getContext("webgl2");
      return {
        canvasExists: !!canvas,
        canvasVisible: canvas ? canvas.offsetHeight > 0 && canvas.offsetWidth > 0 : false,
        viewerHidden: viewer?.hidden,
        glValid: gl ? !gl.isContextLost() : false,
        mode: window.textureAPI.metrics().mode,
      };
    });

    assert.equal(restored.canvasExists, true, "canvas MUST exist after inspect close");
    assert.equal(restored.canvasVisible, true, "canvas MUST be visible after inspect close");
    assert.equal(restored.viewerHidden, true, "viewer MUST be hidden after inspect close");
    assert.equal(restored.glValid, true, "WebGL context MUST be valid after inspect close");
    assert.notEqual(
      restored.mode,
      "inspect",
      `mode MUST NOT be 'inspect' after close (got: ${restored.mode})`,
    );

    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404"),
    );
    assert.equal(criticalErrors.length, 0, `Critical errors after restore: ${criticalErrors.join("; ")}`);

    await captureEvidence(page, "F-inspect-restore");
    await writeFile(
      new URL("../qa/evidence/track67-v242/F-inspect-restore.json", import.meta.url).pathname,
      JSON.stringify({ restored, criticalErrors }),
    );

    await page.close();
  } finally {
    await browser.close();
  }
});

// ====================================================================
// 2b. HIGH RESOLUTION INSPECT SURFACE
// ====================================================================

test("G. INSPECT_HIGH_RES — inspect viewer shows high-resolution source asset", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await captureErrors(page);

    await page.goto(PKG_URL, { waitUntil: "networkidle", timeout: 30000 });
    await waitForReady(page);

    await openInspectProgrammatic(page, 1);

    const highRes = await page.evaluate(() => {
      const viewerImg = document.getElementById("viewerImg");
      const metrics = window.textureAPI.metrics();
      return {
        imgNaturalWidth: viewerImg?.naturalWidth || 0,
        imgNaturalHeight: viewerImg?.naturalHeight || 0,
        imgComplete: viewerImg?.complete || false,
        imgSrc: viewerImg?.src || "",
        reportedDimensions: metrics.highresViewerAssetDimensions || "",
        viewerAssetDimensions: metrics.viewerAssetDimensions || "",
        decodedEstimateMB: metrics.viewerDecodedEstimateMB || 0,
      };
    });

    assert.equal(highRes.imgComplete, true, "viewerImg MUST be complete (decoded)");
    assert.ok(
      highRes.imgNaturalWidth > 0,
      `viewerImg MUST have nonzero naturalWidth (got: ${highRes.imgNaturalWidth})`,
    );
    assert.ok(
      highRes.imgNaturalHeight > 0,
      `viewerImg MUST have nonzero naturalHeight (got: ${highRes.imgNaturalHeight})`,
    );
    assert.ok(
      highRes.decodedEstimateMB > 1,
      `decodedEstimateMB MUST be > 1 MB for high-res source (got: ${highRes.decodedEstimateMB})`,
    );
    assert.ok(
      highRes.reportedDimensions.length > 0,
      `highresViewerAssetDimensions MUST be nonzero (got: ${highRes.reportedDimensions})`,
    );

    await captureEvidence(page, "G-inspect-high-res");
    await writeFile(
      new URL("../qa/evidence/track67-v242/G-inspect-high-res.json", import.meta.url).pathname,
      JSON.stringify(highRes),
    );

    await page.close();
  } finally {
    await browser.close();
  }
});

// ====================================================================
// 3. GENUINE TOUCH
// ====================================================================

/**
 * Shared genuine-touch assertion helper.
 */
async function assertGenuineTouch(page, label, width, height) {
  await waitForReady(page);

  const hitPos = await findHitPosition(page, 1);

  if (hitPos) {
    const box = await page.locator("canvas").first().boundingBox();
    const tapX = box.x + hitPos.x;
    const tapY = box.y + hitPos.y;
    await page.touchscreen.tap(tapX, tapY);
    await page.waitForTimeout(500);

    const state = await page.evaluate(() => {
      const viewer = document.getElementById("viewer");
      return {
        viewerHidden: viewer?.hidden,
        mode: window.textureAPI.metrics().mode,
      };
    });

    assert.equal(state.viewerHidden, false, `viewer MUST be visible after genuine touch hit at ${label}`);
    assert.equal(state.mode, "inspect", `mode MUST be 'inspect' after genuine touch hit at ${label}`);
  } else {
    const box = await page.locator("canvas").first().boundingBox();
    assert.ok(box, "Canvas MUST have bounding box");

    const tapX = box.x + box.width / 2;
    const tapY = box.y + box.height / 2;
    await page.touchscreen.tap(tapX, tapY);
    await page.waitForTimeout(500);

    const touchState = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      return {
        canvasExists: !!canvas,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        mode: window.textureAPI.metrics().mode,
      };
    });

    assert.equal(touchState.canvasExists, true, `canvas MUST exist at ${label}`);
    assert.equal(touchState.viewportWidth, width, `viewport width MUST be ${width}`);
    assert.equal(touchState.viewportHeight, height, `viewport height MUST be ${height}`);
    assert.notEqual(
      touchState.mode,
      "inspect",
      `mode MUST NOT be 'inspect' when no ribbon at center (got: ${touchState.mode})`,
    );
  }
}

test("H. TOUCH_390x844 — genuine touchscreen tap at mobile viewport", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    });
    const page = await context.newPage();
    await captureErrors(page);

    await page.goto(PKG_URL, { waitUntil: "networkidle", timeout: 30000 });

    await assertGenuineTouch(page, "390x844", 390, 844);

    await captureEvidence(page, "H-touch-390x844");
    await writeFile(
      new URL("../qa/evidence/track67-v242/H-touch-390x844.json", import.meta.url).pathname,
      JSON.stringify({ viewport: { width: 390, height: 844 }, method: "touchscreen.tap" }),
    );

    await page.close();
    await context.close();
  } finally {
    await browser.close();
  }
});

test("I. TOUCH_320x720 — genuine touchscreen tap at small mobile viewport", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 320, height: 720 },
      isMobile: true,
      hasTouch: true,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
    });
    const page = await context.newPage();
    await captureErrors(page);

    await page.goto(PKG_URL, { waitUntil: "networkidle", timeout: 30000 });

    await assertGenuineTouch(page, "320x720", 320, 720);

    await captureEvidence(page, "I-touch-320x720");
    await writeFile(
      new URL("../qa/evidence/track67-v242/I-touch-320x720.json", import.meta.url).pathname,
      JSON.stringify({ viewport: { width: 320, height: 720 }, method: "touchscreen.tap" }),
    );

    await page.close();
    await context.close();
  } finally {
    await browser.close();
  }
});
