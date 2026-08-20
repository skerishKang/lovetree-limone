/**
 * Track 67 V2.4.2 — TRUE NATIVE Inspect + Genuine Touch acceptance (FAIL-CLOSED)
 *
 * Targets the NATIVE Next.js route:
 *   /design-lab/lineages/67/v2-4/native
 * — NOT the source HTML package.
 *
 * Every assertion is real and fail-closed: there are no log-only PASS,
 * no conditional-assert, no skip, no catch->PASS, no fixed-sleep readiness
 * waits, and no mouse / click fallbacks for the touch viewports.
 *
 * Design:
 *  - The native renderer exposes read-only observability
 *    (window.__track67Native) that returns projected ribbon geometry + the
 *    ACTUAL hit-test result for any screen point. This is native truth
 *    (same VP matrix drawn with, same v24RayFromPointer / v24RibbonHitTest
 *    authority) — it never mutates state and never opens inspect.
 *  - Acceptance aims genuine touchscreen taps at real rendered ribbon
 *    coordinates derived from that geometry, then verifies the product's own
 *    hit-test selection matched expectations.
 *
 * Environment:
 *   TRACK67_BASE_URL / TRACK67_NATIVE_URL — server base (default http://127.0.0.1:3000)
 */

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { after, before, describe, it } from "node:test";
import { chromium } from "playwright";

const BASE =
  process.env.TRACK67_NATIVE_URL ||
  process.env.TRACK67_BASE_URL ||
  "http://127.0.0.1:3000";
const NATIVE_URL = `${BASE}/design-lab/lineages/67/v2-4/native`;

const EVIDENCE_DIR = new URL("../qa/evidence/track67-v242/", import.meta.url);

// ---------------------------------------------------------------------------
// Authoritative Moment mapping mirrored from the exact V2.4.2 source package
// (public/design-lab-assets/lineages/67/v2-4/track67_v2.4.2_works_compare_menu.html,
//  SHA256 85210be6a3368edd8e5e2d55c94721d91cd031c2cabca1c6698ffabf1e65ae6f).
// Source: MOMENTS=[{id:1..16,src:'01_Assets/MNN_*.png'}] and
//   momentFromQ(q){ qw=((q%CYCLE)+CYCLE)%CYCLE; return floor(qw/SEG_LEN)%16 }
//   SEG_LEN=3.15; CYCLE=SEG_LEN*16; PRINT_OFFSET=.58
// Used ONLY to independently verify the native same-Moment mapping — never to
// generate or substitute assets.
// ---------------------------------------------------------------------------
const MOMENT_SEG_LEN = 3.15;
const MOMENT_CYCLE = MOMENT_SEG_LEN * 16;
const MOMENT_ASSET_FILES = [
  "01_Assets/M01_FIRST_CLUE_STAIRS.png",
  "01_Assets/M02_FAN_A_MAIN.png",
  "01_Assets/M03_EYE_MACRO.png",
  "01_Assets/M04_PURPLE_STAGE.png",
  "01_Assets/M05_MICROPHONE.png",
  "01_Assets/M06_INTERVIEW_CANDID.png",
  "01_Assets/M07_BW_EDITORIAL.png",
  "01_Assets/M08_BLUE_NOIR.png",
  "01_Assets/M09_CAMERA_MOMENT.png",
  "01_Assets/M10_POLAROID_PORTRAIT.png",
  "01_Assets/M11_FIRST_CLUE_KEYFRAME.jpg",
  "01_Assets/M12_MY_LOVETREE.jpg",
  "01_Assets/M13_FILM_STRIP.png",
  "01_Assets/M14_WARM_CANDID.png",
  "01_Assets/M15_NATURAL_PORTRAIT.png",
  "01_Assets/M16_WIDE_FINAL.png",
];

function momentFromQ(q) {
  const qw = ((q % MOMENT_CYCLE) + MOMENT_CYCLE) % MOMENT_CYCLE;
  return Math.floor(qw / MOMENT_SEG_LEN) % 16 + 1;
}

// ---------------------------------------------------------------------------
// Phase timing (issue #258 runtime diagnostics)
// ---------------------------------------------------------------------------
const T0 = Date.now();
function phase(label) {
  const ms = Date.now() - T0;
  const mm = String(Math.floor(ms / 60000)).padStart(2, "0");
  const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  const mmm = String(ms % 1000).padStart(3, "0");
  console.log(`[${mm}:${ss}.${mmm}] ${label}`);
}

async function ensureEvidenceDir() {
  await mkdir(EVIDENCE_DIR, { recursive: true });
}

async function captureEvidence(page, name) {
  await ensureEvidenceDir();
  const path = new URL(`../qa/evidence/track67-v242/${name}.png`, import.meta.url);
  await page.screenshot({ path: path.pathname, fullPage: false });
}

// ---------------------------------------------------------------------------
// Single shared browser lifecycle (runtime bottleneck fix: one launch)
// ---------------------------------------------------------------------------
let browser;
let desktopPage;
let desktopCtx;
let touch390Page;
let touch390Ctx;
let touch320Page;
let touch320Ctx;

before(async () => {
  phase("chromium.launch (single lifecycle)");
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--use-gl=angle", "--use-angle=swiftshader-webgl"],
  });
});

after(async () => {
  for (const p of [desktopPage, touch390Page, touch320Page]) {
    if (p) await p.close().catch(() => {});
  }
  for (const c of [desktopCtx, touch390Ctx, touch320Ctx]) {
    if (c) await c.close().catch(() => {});
  }
  if (browser) await browser.close();
  phase("browser closed");
});

// ---------------------------------------------------------------------------
// Native readiness (issue #13): NOT networkidle. domcontentloaded + native
// specific conditions: canvas rendered, WebGL program linked (no error fallback),
// ribbon geometry baked (>= 2 static chunks), and the read-only native
// observability present (interaction authority + hit-test state available).
// ---------------------------------------------------------------------------
async function openNative(page) {
  await page.goto(NATIVE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  phase("waiting native ready");
  await page.waitForFunction(
    () => {
      const c = document.querySelector("canvas.lt67-native__canvas");
      const api = window.__track67Native;
      if (!c || c.width === 0 || c.clientHeight === 0) return false;
      // WebGL failed ⇒ error fallback mounted ⇒ never ready.
      if (document.querySelector(".lt67-native__fallback")) return false;
      if (!api) return false;
      const snap = api.getSimSnapshot();
      return snap.chunks >= 2;
    },
    undefined,
    { timeout: 30000 },
  );
  phase("native ready");
}

// ---------------------------------------------------------------------------
// Production UI control: pause/resume playback to stabilize geometry for a
// deterministic, genuine touchscreen aim. (Legitimate product control, not a
// selection fallback.)
// ---------------------------------------------------------------------------
// Idempotent playback control. Reads the current toggle label so a redundant
// pause/resume is a no-op (genuine UI interaction; a real touchscreen tap on the
// HUD button flips state only when needed).
async function setPlaying(page, wantPlay) {
  const btn = page.locator(".lt67-native__hud button", { hasText: /재생|일시정지/ }).first();
  await btn.scrollIntoViewIfNeeded();
  const box = await btn.boundingBox();
  assert.ok(box, "playback toggle button MUST exist");
  const label = (await btn.textContent()) || "";
  const currentlyPlaying = label.includes("일시정지"); // button shows "pause" ⇒ playing
  if (currentlyPlaying === wantPlay) return; // already in desired state
  // Genuine UI interaction. All contexts are hasTouch, so a real touchscreen tap
  // is the faithful control (no mouse fallback for the touch viewports, and a
  // real touch on desktop is still a legitimate product control).
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  const wantLabel = wantPlay ? "일시정지" : "재생";
  await page.locator(".lt67-native__hud button", { hasText: wantLabel }).first().waitFor({ timeout: 5000 });
}

async function ensureNoDialog(page) {
  const dlg = page.locator("[role='dialog']");
  if (await dlg.count()) {
    await page.keyboard.press("Escape");
    await dlg.waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Resolve a deterministic, genuine-screen hit candidate from native geometry
// authority (issue #15). NO blind scan, NO mouse probing.
// ---------------------------------------------------------------------------
async function resolveAim(page, preferOverlap) {
  const aim = await page.evaluate(
    (pref) => {
      const api = window.__track67Native;
      if (!api) return null;
      const cands = api.getHitCandidates();
      const chunkCands = cands.filter((c) => c.expectedKind === "chunk");
      if (chunkCands.length === 0) return null;
      if (pref) {
        const overlap = chunkCands.find((c) => c.candidateCount >= 2);
        if (overlap) return overlap;
      }
      return chunkCands[0];
    },
    preferOverlap,
  );
  assert.ok(aim, "MUST resolve a real rendered ribbon hit coordinate from native geometry (no fallback)");
  return aim;
}

// ---------------------------------------------------------------------------
// Genuine touchscreen tap on a resolved candidate, then await the inspect
// dialog. Returns the dialog's identity + the product's own hit observables.
// ---------------------------------------------------------------------------
async function openInspectViaTouch(page, aim) {
  // Ensure the canvas is in the viewport (the page may have scrolled when a
  // prior dialog opened/closed) and recompute FRESH screen coordinates for the
  // same target surface — getHitCandidates() projects against the live canvas
  // rect, so stale coords from before a scroll would miss the ribbon.
  await page.locator("canvas.lt67-native__canvas").scrollIntoViewIfNeeded();
  const fresh = await page.evaluate((sid) => {
    const cs = window.__track67Native.getHitCandidates().filter(
      (c) => c.expectedKind === "chunk" && String(c.expectedSurfaceId) === String(sid),
    );
    return cs[0] || null;
  }, aim.expectedSurfaceId);
  const tapAt = fresh || aim;
  await page.touchscreen.tap(tapAt.x, tapAt.y);
  await page
    .locator("[role='dialog'][data-inspect-open='true']")
    .waitFor({ state: "visible", timeout: 8000 });
  const info = await page.evaluate(() => {
    const dlg = document.querySelector("[role='dialog'][data-inspect-open='true']");
    const canvas = document.querySelector("canvas.lt67-native__canvas");
    return {
      dialogChunkId: dlg ? dlg.getAttribute("data-inspect-chunk-id") : null,
      hitKind: canvas ? canvas.getAttribute("data-hit-kind") : null,
      hitSurfaceId: canvas ? canvas.getAttribute("data-hit-surface-id") : null,
      hitCandidateCount: canvas ? Number(canvas.getAttribute("data-hit-candidate-count")) : 0,
      hitCandidates: canvas ? canvas.getAttribute("data-hit-candidates") : "",
      pointerType: canvas ? canvas.getAttribute("data-hit-pointer-type") : null,
    };
  });
  return info;
}

async function getSnapshot(page) {
  return page.evaluate(() => window.__track67Native?.getSimSnapshot() ?? null);
}

// ===========================================================================
// Test matrix
// ===========================================================================
describe("Track67 V2.4.2 native inspect acceptance", () => {
  // ---- Desktop: dialog / focus / tab / escape / freeze / high-res ----
  describe("desktop 1280x800 (dialog/focus/tab/escape/freeze/high-res)", () => {
    before(async () => {
      desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
      desktopPage = await desktopCtx.newPage();
      await openNative(desktopPage);
    });
    after(async () => {
      const d = desktopPage;
      if (d && !(await d.isClosed())) {
        const open = (await d.locator("[role='dialog']").count()) > 0;
        if (open) await d.keyboard.press("Escape");
      }
    });

    const canvasEl = () => desktopPage.locator("canvas.lt67-native__canvas");

    it("A. native_route_loads — canvas, WebGL, ribbon geometry", async () => {
      phase("A. route-load assertions");
      const errors = [];
      desktopPage.on("pageerror", (e) => errors.push(e.message));

      const canvas = canvasEl();
      await canvas.waitFor({ timeout: 1000 });
      assert.equal(await canvas.count(), 1, "Native canvas MUST exist");
      const w = await canvas.getAttribute("data-hit-kind");
      assert.ok(w !== null, "interaction handler MUST be bound (data-hit-* present)");
      assert.ok(!errors.some((e) => !e.includes("favicon")), `page errors: ${errors.join("; ")}`);
      const fallback = desktopPage.locator(".lt67-native__fallback");
      assert.equal(await fallback.count(), 0, "WebGL MUST render, no fallback");
      const snap = await getSnapshot(desktopPage);
      assert.ok(snap.chunks >= 2, "ribbon geometry MUST be baked (≥2 static chunks)");
      await captureEvidence(desktopPage, "native-A-route-load");
    });

    it("B. NATIVE_INSPECT_FREEZE — state snapshot frozen while inspect open (even when playing)", async () => {
      phase("B. freeze — resolve aim + open");
      await setPlaying(desktopPage, false);
      const aim = await resolveAim(desktopPage, false);
      const res = await openInspectViaTouch(desktopPage, aim);
      assert.equal(res.hitKind, "chunk", "tap MUST hit a rendered chunk surface");
      assert.equal(String(res.dialogChunkId), res.hitSurfaceId, "dialog identity MUST equal native hit surface");

      // While inspect is open, unpause → playing=true but freeze gate must still hold.
      await setPlaying(desktopPage, true);
      assert.equal((await getSnapshot(desktopPage)).frozen, true, "inspect gate MUST report frozen=true");

      phase("B. freeze — observation window");
      const s1 = await getSnapshot(desktopPage);
      // Deliberate, documented observation window: the sim would advance ~6 units/sec
      // over this interval if not frozen. Required to observe non-progression.
      await desktopPage.waitForTimeout(1200);
      const s2 = await getSnapshot(desktopPage);
      assert.deepEqual(
        { t: s1.travel, c: s1.chunks, r: s1.raw },
        { t: s2.travel, c: s2.chunks, r: s2.raw },
        "internal sim state MUST be frozen while inspect is open",
      );
      assert.equal(res.dialogChunkId, await desktopPage.getAttribute("[role='dialog']", "data-inspect-chunk-id"),
        "selected chunk identity MUST be preserved while frozen");
      await captureEvidence(desktopPage, "native-B-inspect-freeze");
      await closeInspectDesktop();
    });

    it("C. NATIVE_INSPECT_DIALOG — role + aria-modal + structure", async () => {
      phase("C. dialog semantics");
      await openInspectFromFreshAim();
      const dlg = desktopPage.locator("[role='dialog'][aria-modal='true'][data-inspect-open='true']");
      await dlg.waitFor({ state: "visible", timeout: 3000 });
      const attrs = await desktopPage.evaluate(() => {
        const d = document.querySelector("[role='dialog'][data-inspect-open='true']");
        return {
          role: d?.getAttribute("role"),
          ariaModal: d?.getAttribute("aria-modal"),
          ariaLabel: d?.getAttribute("aria-label"),
          dataInspectOpen: d?.getAttribute("data-inspect-open"),
          hidden: d ? d.hidden : null,
          hasHeading: !!d?.querySelector("h2"),
          hasCloseBtn: !!d?.querySelector("button[aria-label*='Close']"),
          hasMomentImg: !!d?.querySelector("img[alt*='high-resolution']"),
          dataChunkId: d?.getAttribute("data-inspect-chunk-id"),
        };
      });
      assert.equal(attrs.role, "dialog");
      assert.equal(attrs.ariaModal, "true");
      assert.ok(attrs.ariaLabel);
      assert.equal(attrs.dataInspectOpen, "true");
      assert.equal(attrs.hidden, false);
      assert.equal(attrs.hasHeading, true);
      assert.equal(attrs.hasCloseBtn, true);
      assert.equal(attrs.hasMomentImg, true);
      assert.ok(attrs.dataChunkId);
      await captureEvidence(desktopPage, "native-C-inspect-dialog");
      await closeInspectDesktop();
    });

    it("D. NATIVE_INSPECT_ARIA_MODAL — focus entered inside dialog deterministically", async () => {
      phase("D. focus entry");
      await openInspectFromFreshAim();
      await desktopPage.locator("[role='dialog']").waitFor({ state: "visible", timeout: 3000 });
      await desktopPage.waitForFunction(() => {
        const active = document.activeElement;
        const dlg = document.querySelector("[role='dialog']");
        return active && dlg && dlg.contains(active) && active.tabIndex >= 0;
      }, undefined, { timeout: 4000 });
      const active = await desktopPage.evaluate(() => {
        const a = document.activeElement;
        const dlg = document.querySelector("[role='dialog']");
        return {
          tag: a?.tagName,
          isInsideDialog: !!(dlg && a && dlg.contains(a)),
          isFocusable: a ? a.tabIndex >= 0 : false,
        };
      });
      assert.equal(active.isInsideDialog, true, "focus MUST be inside the dialog after open");
      assert.equal(active.isFocusable, true, "focused element MUST be focusable");
      await captureEvidence(desktopPage, "native-D-focus-entry");
      await closeInspectDesktop();
    });

    it("E. NATIVE_INSPECT_TAB_CONTAINMENT — Tab stays inside dialog and cycles", async () => {
      phase("E. tab containment");
      await openInspectFromFreshAim();
      await desktopPage.locator("[role='dialog']").waitFor({ state: "visible", timeout: 3000 });
      await desktopPage.keyboard.press("Tab");
      const after1 = await focusInside();
      assert.equal(after1, true, "Tab MUST keep focus inside dialog");
      await desktopPage.keyboard.press("Tab");
      const after2 = await focusInside();
      assert.equal(after2, true, "Tab MUST keep cycling inside dialog");
      await captureEvidence(desktopPage, "native-E-tab-containment");
      await closeInspectDesktop();
    });

    it("F. NATIVE_INSPECT_SHIFT_TAB — Shift+Tab stays inside dialog", async () => {
      phase("F. shift+tab containment");
      await openInspectFromFreshAim();
      await desktopPage.locator("[role='dialog']").waitFor({ state: "visible", timeout: 3000 });
      await desktopPage.keyboard.press("Shift+Tab");
      assert.equal(await focusInside(), true, "Shift+Tab MUST keep focus inside dialog");
      await desktopPage.keyboard.press("Shift+Tab");
      assert.equal(await focusInside(), true, "Shift+Tab MUST keep cycling inside dialog");
      await captureEvidence(desktopPage, "native-F-shift-tab");
      await closeInspectDesktop();
    });

    it("G. NATIVE_INSPECT_ESCAPE — Escape closes dialog", async () => {
      phase("G. escape");
      await openInspectFromFreshAim();
      await desktopPage.locator("[role='dialog']").waitFor({ state: "visible", timeout: 3000 });
      await desktopPage.keyboard.press("Escape");
      const closed = await desktopPage.evaluate(() => {
        const d = document.querySelector("[role='dialog']");
        return !d || d.hidden || d.offsetHeight === 0;
      });
      assert.equal(closed, true, "Escape MUST close the dialog");
      await captureEvidence(desktopPage, "native-G-escape");
    });

    it("H. NATIVE_INSPECT_FOCUS_RESTORE + SAME_MOMENT_HIGH_RES — focus to trigger + authoritative moment asset", async () => {
      phase("H. focus restore + high-res mapping");
      await setPlaying(desktopPage, false);
      const aim = await resolveAim(desktopPage, false);
      const triggerHandle = await desktopPage.evaluateHandle(() => document.querySelector("canvas.lt67-native__canvas"));
      const res = await openInspectViaTouch(desktopPage, aim);

      // Focus restore: Escape → focus returns to the trigger (canvas) element exactly
      await desktopPage.keyboard.press("Escape");
      await desktopPage.locator("[role='dialog']").waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
      const restoredToTrigger = await desktopPage.evaluate((h) => h === document.activeElement, triggerHandle);
      assert.equal(restoredToTrigger, true, "focus MUST restore to the exact trigger element (canvas)");

      // Re-open for high-res check
      await setPlaying(desktopPage, false);
      const aim2 = await resolveAim(desktopPage, false);
      const res2 = await openInspectViaTouch(desktopPage, aim2);
      // Independent authoritative expected moment from the dialog's own q0:
      const q0 = await desktopPage.getAttribute("[role='dialog']", "data-inspect-q0");
      const expectedMoment = momentFromQ(Number(q0));
      const momentId = await desktopPage.getAttribute("[role='dialog'] [data-moment-id]", "data-moment-id");
      const img = await desktopPage.locator("[role='dialog'] img[alt*='high-resolution']");
      const src = await img.getAttribute("src");
      assert.ok(src, "high-res asset img MUST exist");
      assert.ok(src.startsWith("/design-lab-assets/lineages/67/v2-4/01_Assets/"), "asset MUST come from the committed V2.4.2 package");
      const fileTail = src.replace("/design-lab-assets/lineages/67/v2-4/", "");
      assert.equal(MOMENT_ASSET_FILES.includes(fileTail), true, `asset MUST be an authoritative V2.4.2 package file (got ${fileTail})`);
      assert.equal(String(expectedMoment), momentId ?? "", "moment id MUST match q0→momentFromQ authoritative mapping");
      assert.equal(fileTail, MOMENT_ASSET_FILES[expectedMoment - 1], "selected moment MUST map to the same-Moment package asset");
      assert.equal(await img.evaluate((el) => el.complete && el.naturalWidth > 0 && el.naturalHeight > 0), true, "high-res asset MUST be fully decoded with real pixel dimensions");
      await captureEvidence(desktopPage, "native-H-focus-restore-highres");
      await closeInspectDesktop();
    });

    it("I. FRONTMOST_SELECTION — frontmost chunk chosen on an overlapping hit", async () => {
      phase("I. frontmost (overlap)");
      const snapshotBefore = await getSnapshot(desktopPage);
      await setPlaying(desktopPage, false);
      // prefer an overlapping candidate (candidateCount>=2) to prove frontmost resolution
      const aim = await resolveAim(desktopPage, true);
      assert.ok(aim.candidateCount >= 2, "MUST exercise a genuine self-cross / overlap (candidateCount>=2) to prove frontmost selection");
      const res = await openInspectViaTouch(desktopPage, aim);
      assert.equal(res.hitSurfaceId, firstCandidateId(res.hitCandidates), "NATIVE hit authority MUST select frontmost = nearest candidate");
      assert.equal(String(res.dialogChunkId), res.hitSurfaceId, "dialog identity MUST equal the frontmost surface id");
      await captureEvidence(desktopPage, "native-I-frontmost");
      await closeInspectDesktop();
      const snapshotAfter = await getSnapshot(desktopPage);
      assert.deepEqual(snapshotBefore.chunkIds, snapshotAfter.chunkIds, "chunk retention MUST hold: no oldest-chunk eviction");
    });

    it("J. STATE_PRESERVATION — world resumes, chunks/identity retained after close", async () => {
      phase("J. state preservation");
      await setPlaying(desktopPage, true);
      const pre = await getSnapshot(desktopPage);
      await setPlaying(desktopPage, false);
      const aim = await resolveAim(desktopPage, false);
      await openInspectViaTouch(desktopPage, aim);
      await desktopPage.keyboard.press("Escape");
      await desktopPage.locator("[role='dialog']").waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
      // resume playback → sim MUST advance (proves freeze came from inspect, not a stuck sim)
      await setPlaying(desktopPage, true);
      await desktopPage.waitForFunction((p) => {
        const now = window.__track67Native?.getSimSnapshot();
        return now && now.travel > p.travel;
      }, pre, { timeout: 5000 });
      const oldest = await getSnapshot(desktopPage);
      assert.deepEqual(oldest.chunkIds, pre.chunkIds, "chunk set MUST be preserved (no eviction)");
      assert.equal(oldest.frozen, false, "inspect MUST be closed (frozen flag cleared)");
    });
  });

  // ---- Helpers local to the desktop group ----
  async function closeInspectDesktop() {
    const dlg = desktopPage.locator("[role='dialog']");
    if (await dlg.count()) {
      const btn = desktopPage.locator("[role='dialog'] button[aria-label*='Close']").first();
      if (await btn.isVisible().catch(() => false)) await btn.click();
      else await desktopPage.keyboard.press("Escape");
      await desktopPage.locator("[role='dialog']").waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
    }
    // clear hit observable
    await desktopPage.waitForFunction(() => {
      const c = document.querySelector("canvas.lt67-native__canvas");
      return c && c.getAttribute("data-hit-kind") === "none";
    }, undefined, { timeout: 3000 });
  }

  async function openInspectFromFreshAim() {
    await ensureNoDialog(desktopPage);
    await setPlaying(desktopPage, false); // pause → stabilize geometry (idempotent)
    const aim = await resolveAim(desktopPage, false);
    await openInspectViaTouch(desktopPage, aim);
  }

  async function focusInside() {
    return desktopPage.evaluate(() => {
      const active = document.activeElement;
      const dlg = document.querySelector("[role='dialog']");
      return !!(dlg && active && dlg.contains(active));
    });
  }

  function firstCandidateId(candidates) {
    if (!candidates) return "";
    return candidates.split(",")[0].split(":")[0];
  }

  // ---- Genuine touch: 390 x 844 ----
  describe("genuine touch 390x844", () => {
    before(async () => {
      touch390Ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      touch390Page = await touch390Ctx.newPage();
      await openNative(touch390Page);
    });

    it("K. TOUCH_390x844 — genuine touch selects frontmost chunk and inspect opens", async () => {
      phase("K. touch 390x844 resolve");
      const pre = await getSnapshot(touch390Page);
      await setPlaying(touch390Page, false); // stabilize geometry
      // NO_MOUSE proof: count only REAL mouse pointers. A genuine touchscreen tap
      // is a PointerEvent with pointerType==='touch' (and may also emit synthetic
      // compatibility mouse events, which we deliberately ignore — those are not a
      // mouse-fallback selection path). A real page.mouse click would be
      // pointerType==='mouse' and MUST be counted so the gate fails closed.
      await touch390Page.evaluate(() => {
        window.__t67MouseCount = 0;
        const handler = (e) => {
          const pe = e;
          if (typeof pe.pointerType === "string" && pe.pointerType === "mouse") {
            window.__t67MouseCount++;
          }
        };
        document.addEventListener("pointerdown", handler, true);
        window.__t67MouseHandler = handler;
      });
      const aim = await resolveAim(touch390Page, false);
      assert.equal(aim.expectedKind, "chunk", "touch aim MUST resolve to a chunk surface (no-hit = FAIL)");
      phase("K. touch 390x844 tap");
      const res = await openInspectViaTouch(touch390Page, aim);
      assert.equal(res.hitKind, "chunk");
      assert.equal(res.pointerType, "touch", "selection MUST come from a genuine touchscreen tap");
      assert.equal(String(res.dialogChunkId), res.hitSurfaceId, "dialog identity MUST be the frontmost native hit");
      assert.equal(res.hitSurfaceId, firstCandidateId(res.hitCandidates), "selected MUST be nearest candidate (frontmost)");

      // close via close button (genuine touch) and verify state preservation
      const closeBtn = touch390Page.locator("[role='dialog'] button[aria-label*='Close']").first();
      await closeBtn.scrollIntoViewIfNeeded();
      const cbox = await closeBtn.boundingBox();
      assert.ok(cbox, "close button MUST be reachable in dialog");
      await touch390Page.touchscreen.tap(cbox.x + cbox.width / 2, cbox.y + cbox.height / 2);
      await touch390Page.locator("[role='dialog']").waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
      const post = await getSnapshot(touch390Page);
      assert.deepEqual(post.chunkIds, pre.chunkIds, "chunk set MUST be preserved across inspect open/close");
      assert.equal(post.frozen, false, "inspect MUST be closed");
      const mouseCount = await touch390Page.evaluate(() => window.__t67MouseCount ?? 0);
      assert.equal(mouseCount, 0, "touch acceptance MUST NOT dispatch mouse events (no mouse fallback)");
      await captureEvidence(touch390Page, "native-K-touch-390x844");
    });
  });

  describe("genuine touch 320x720", () => {
    before(async () => {
      touch320Ctx = await browser.newContext({
        viewport: { width: 320, height: 720 },
        isMobile: true,
        hasTouch: true,
      });
      touch320Page = await touch320Ctx.newPage();
      await openNative(touch320Page);
    });

    it("L. TOUCH_320x720 — genuine touch selects frontmost chunk and inspect opens", async () => {
      phase("L. touch 320x720 resolve + tap");
      const pre = await getSnapshot(touch320Page);
      await setPlaying(touch320Page, false);
      const aim = await resolveAim(touch320Page, false);
      assert.equal(aim.expectedKind, "chunk", "touch aim MUST resolve to a chunk surface (no-hit = FAIL)");
      const res = await openInspectViaTouch(touch320Page, aim);
      assert.equal(res.hitKind, "chunk");
      assert.equal(res.pointerType, "touch", "selection MUST come from a genuine touchscreen tap");
      assert.equal(String(res.dialogChunkId), res.hitSurfaceId, "dialog identity MUST be the frontmost native hit");
      assert.equal(res.hitSurfaceId, firstCandidateId(res.hitCandidates), "selected MUST be nearest candidate (frontmost)");
      const closeBtn = touch320Page.locator("[role='dialog'] button[aria-label*='Close']").first();
      await closeBtn.scrollIntoViewIfNeeded();
      const cbox = await closeBtn.boundingBox();
      assert.ok(cbox, "close button MUST be reachable");
      await touch320Page.touchscreen.tap(cbox.x + cbox.width / 2, cbox.y + cbox.height / 2);
      await touch320Page.locator("[role='dialog']").waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
      const post = await getSnapshot(touch320Page);
      assert.deepEqual(post.chunkIds, pre.chunkIds, "chunk set MUST be preserved across inspect open/close");
      assert.equal(post.frozen, false);
      await captureEvidence(touch320Page, "native-L-touch-320x720");
    });
  });
});
