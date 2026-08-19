// Track67 V2.4.2 native browser QA evidence helper.
//
// Intentionally lives OUTSIDE the standard `tests/*.test.mjs` corpus so it is
// NOT picked up by the shared A-track fail-closed browser inventory. It is run
// only by `.github/workflows/track67-native-browser-qa.yml` (dedicated Track67
// evidence gate). Pure additive QA evidence — no backend/API/DB/Auth changes.
//
// Evidence artifact emitted under qa-artifacts/track67-native/:
//   qa-results.json for Web CTO review.
//
// Full A–K matrix per viewport (desktop 1280x800, phone 390x844, mobile
// 320x720) — desktop AND mobile run the SAME depth (persistence, oldest
// retention, real pointer hits, rewind), in PARALLEL browser contexts so the
// wall-clock stays bounded:
//   A. route load
//   B. horizontal overflow = 0
//   C. unexpected console errors = 0
//   D. page errors = 0
//   E. real rendered static chunk hit (actual pointer → camera-ray → ribbon)
//   F. real active-tail hit (`data-hit-kind="tail"` via actual pointer)
//   G. persistence: static chunks > 112 (no eviction cap)
//   H. oldest chunk retained (HUD oldest == first-ever baked chunk id)
//   I. rewind progression (travel decreases under Space)
//   J. rewind to origin (full-state restoration, travel 0)
//   K. WORKS fail-closed surface reachable
//
// The native route exposes bounded READ-ONLY hit observability through
// window.__track67Native.getHitCandidates(). It projects actual rendered ribbon
// geometry with the same fixed source-faithful camera and evaluates the same
// production hit-test authority. The harness uses it only to AIM a real mouse
// click at a real positive surface; selection still goes through the product's
// onPointerDown pipeline and is verified from canvas[data-hit-*]. No fabricated
// hits, no synthetic selection injection, no viewport exemption, no skip.

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
      surfaceId: c.dataset.hitSurfaceId ?? null,
      distance: c.dataset.hitDistance ?? null,
      candidateCount: c.dataset.hitCandidateCount ?? null,
      candidates: c.dataset.hitCandidates ?? null,
      pointerType: c.dataset.hitPointerType ?? null,
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

function parseCandidates(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => {
      const [id, t] = part.split(":");
      return { id, t: Number(t) };
    })
    .filter((c) => Number.isFinite(c.t));
}

async function setPlaying(page, wantPlay) {
  const btn = page.locator(".lt67-native__hud button", { hasText: /재생|일시정지/ }).first();
  const label = (await btn.textContent()) || "";
  const currentlyPlaying = label.includes("일시정지");
  if (currentlyPlaying === wantPlay) return;
  await btn.click();
  const wantLabel = wantPlay ? "일시정지" : "재생";
  await page.locator(".lt67-native__hud button", { hasText: wantLabel }).first().waitFor({ timeout: 5000 });
}

async function closeInspect(page) {
  const dlg = page.locator(".lt67-native__inspect");
  if ((await dlg.count()) === 0) return;
  const close = page.getByRole("button", { name: "Close Moment inspection" });
  if ((await close.count()) !== 1) throw new Error("inspect close button unavailable");
  await close.click();
  await dlg.waitFor({ state: "detached", timeout: 5000 });
}

async function getNativeCandidate(page, kind, requireOverlap = false) {
  await page.locator("canvas.lt67-native__canvas").scrollIntoViewIfNeeded();
  return page.evaluate(({ expectedKind, overlap }) => {
    const api = window.__track67Native;
    if (!api || typeof api.getHitCandidates !== "function") return null;
    const cands = api.getHitCandidates().filter((c) => c.expectedKind === expectedKind);
    if (overlap) return cands.find((c) => c.candidateCount >= 2) || null;
    return cands[0] || null;
  }, { expectedKind: kind, overlap: requireOverlap });
}

async function waitNativeCandidate(page, kind, requireOverlap, timeoutMs) {
  return waitFor(page, () => getNativeCandidate(page, kind, requireOverlap), timeoutMs, 120);
}

async function clickNativeCandidate(page, candidate) {
  await page.mouse.click(candidate.x, candidate.y);
  await page.waitForTimeout(80);
  return readCanvasDataset(page);
}

// F: active tail proof belongs to the SPARSE phase. This avoids the old
// blind-grid problem where, after >112 static chunks, the tiny live tail could
// be visually occluded and a fixed 8x12 grid never sampled it. The read-only
// native authority resolves a real visible tail point, then a REAL mouse click
// must independently produce data-hit-kind="tail".
async function runTailProof(page, vp) {
  const candidate = await waitNativeCandidate(page, "tail", false, 120000);
  if (!candidate) {
    record(vp, "F. active tail positive hit (real pointer)", false, "no native tail candidate became visible");
    return;
  }

  await setPlaying(page, false);
  const stable = await getNativeCandidate(page, "tail", false);
  if (!stable) {
    await setPlaying(page, true);
    record(vp, "F. active tail positive hit (real pointer)", false, "tail candidate disappeared before stable click");
    return;
  }

  const ds = await clickNativeCandidate(page, stable);
  const ok = Boolean(
    ds &&
      ds.hitKind === "tail" &&
      String(ds.surfaceId) === String(stable.expectedSurfaceId) &&
      ds.pointerType === "mouse",
  );
  record(
    vp,
    "F. active tail positive hit (real pointer)",
    ok,
    ds ? `tail surface ${ds.surfaceId} @ t=${ds.distance}; pointer=${ds.pointerType}` : "no hit dataset",
  );
  await setPlaying(page, true);
}

// E + F2: deterministic AIM from read-only native geometry, but the actual
// proof remains a production pointer event. Frontmost comparison respects the
// observables' intentional precision difference: selected distance is 4dp,
// candidate distances are 3dp, so <=0.001 is the strict rounding envelope.
async function runChunkAndFrontmostProofs(page, vp) {
  const overlap = await waitNativeCandidate(page, "chunk", true, 120000);
  const anyChunk = overlap || (await waitNativeCandidate(page, "chunk", false, 120000));

  if (!anyChunk) {
    record(vp, "E. static chunk positive hit (real pointer)", false, "no native chunk candidate became visible");
    record(vp, "F2. frontmost/nearest selection (real pointer, >=2 positive candidates)", false, "no chunk candidate available");
    return;
  }

  await setPlaying(page, false);

  const stableChunk = await getNativeCandidate(page, "chunk", false);
  let chunkDs = null;
  if (stableChunk) {
    chunkDs = await clickNativeCandidate(page, stableChunk);
  }
  const chunkOk = Boolean(
    stableChunk &&
      chunkDs &&
      chunkDs.hitKind === "chunk" &&
      String(chunkDs.surfaceId) === String(stableChunk.expectedSurfaceId) &&
      chunkDs.pointerType === "mouse",
  );
  record(
    vp,
    "E. static chunk positive hit (real pointer)",
    chunkOk,
    chunkDs ? `surface ${chunkDs.surfaceId} @ t=${chunkDs.distance}; pointer=${chunkDs.pointerType}` : "no chunk hit dataset",
  );
  await closeInspect(page);

  const stableOverlap = await getNativeCandidate(page, "chunk", true);
  let frontDs = null;
  if (stableOverlap) {
    frontDs = await clickNativeCandidate(page, stableOverlap);
  }

  let frontOk = false;
  let frontDetail = "no multi-candidate native aim available";
  if (stableOverlap && frontDs) {
    const cands = parseCandidates(frontDs.candidates);
    const count = Number(frontDs.candidateCount || 0);
    const selDist = Number(frontDs.distance);
    const nearest = cands[0] || null;
    frontOk = Boolean(
      frontDs.hitKind === "chunk" &&
        frontDs.pointerType === "mouse" &&
        count >= 2 &&
        cands.length >= 2 &&
        nearest &&
        String(nearest.id) === String(frontDs.surfaceId) &&
        String(frontDs.surfaceId) === String(stableOverlap.expectedSurfaceId) &&
        Math.abs(nearest.t - selDist) <= 0.001 &&
        nearest.t <= cands[1].t,
    );
    frontDetail = `selected ${frontDs.surfaceId} @ ${frontDs.distance}; candidates ${frontDs.candidates}; pointer=${frontDs.pointerType}`;
  }
  record(
    vp,
    "F2. frontmost/nearest selection (real pointer, >=2 positive candidates)",
    frontOk,
    frontDetail,
  );
  await closeInspect(page);
  await setPlaying(page, true);
}

// E2 negative control on the SPARSE world (before persistence fills the view
// with >112 ribbons — in a dense world even broad regions can legitimately hit
// a wall). Pause first so the geometry is stable, then probe a bounded grid of
// REAL mouse pixels until the production hit-test itself reports `none`.
async function runSparseNoHitControl(page, vp) {
  await waitFor(page, async () => {
    const n = parseInt(await readHud(page, "static chunks"), 10);
    return Number.isFinite(n) && n >= 1 ? n : null;
  }, 120000);

  await setPlaying(page, false);
  const box = await page.locator("canvas.lt67-native__canvas").boundingBox();
  if (!box) throw new Error("canvas boundingBox unavailable during sparse control");

  const xSteps = 11;
  const ySteps = 9;
  let noneSeen = false;
  let last = null;
  let probes = 0;
  outer: for (let yi = 0; yi < ySteps; yi += 1) {
    for (let xi = 0; xi < xSteps; xi += 1) {
      const x = (box.width * (xi + 0.5)) / xSteps;
      const y = (box.height * (yi + 0.5)) / ySteps;
      await clickCanvasPixel(page, x, y);
      probes += 1;
      await page.waitForTimeout(40);
      const ds = await readCanvasDataset(page);
      last = ds?.hitKind;
      if (ds?.hitKind === "none") {
        noneSeen = true;
        break outer;
      }
      await closeInspect(page);
    }
  }

  record(
    vp,
    "E2. sparse-world empty-space click -> no hit (negative control)",
    noneSeen,
    `probes=${probes}; last hitKind=${last}`,
  );
  await setPlaying(page, true);
}

async function runWorks(page, vp) {
  const worksCount = await page.locator(".lt67-native__works-item").count();
  record(vp, "K. WORKS owner set surface present", worksCount >= 1, `items=${worksCount}`);
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
    "K2. WORKS fail-closed (HOLD/REFERENCE disabled, ENABLED have href)",
    worksOpenCounts.holdRefTotal === worksOpenCounts.holdRefDisabled && worksOpenCounts.enabledHrefCount >= 1,
    JSON.stringify(worksOpenCounts),
  );
}

// G + H: exceed 112 chunks AND the first-ever baked chunk is still resident.
async function runPersistence(page, vp) {
  const firstOldest = await waitFor(
    page,
    async () => {
      const raw = await readHud(page, "oldest chunk");
      const m = raw && raw.match(/^#(\d+)$/);
      return m ? Number(m[1]) : null;
    },
    120000,
  );
  if (firstOldest === null) {
    record(vp, "G. static chunks exceed 112 (persistent, no eviction cap)", false, "first chunk never appeared");
    record(vp, "H. oldest chunk retained after >112", false, "no first chunk to track");
    return;
  }
  const reached = await waitFor(
    page,
    async () => {
      const n = parseInt(await readHud(page, "static chunks"), 10);
      return Number.isFinite(n) && n > 112 ? n : null;
    },
    300000,
  );
  record(vp, "G. static chunks exceed 112 (persistent, no eviction cap)", reached !== null, `chunks=${reached}`);
  const oldestNow = await readHud(page, "oldest chunk");
  const oldestMatch = oldestNow && oldestNow.match(/^#(\d+)$/);
  const oldestId = oldestMatch ? Number(oldestMatch[1]) : null;
  record(
    vp,
    "H. oldest chunk retained after >112 (first-ever chunk still resident)",
    reached !== null && oldestId === firstOldest,
    `first=#${firstOldest} now=${oldestNow}`,
  );
}

// I + J: rewind progression then full-state rewind to origin (paused world).
async function runRewind(page, vp) {
  const pauseBtn = page.getByRole("button", { name: /일시정지/ });
  if (await pauseBtn.count()) await pauseBtn.click();
  await page.locator("canvas.lt67-native__canvas").focus();
  const t0 = parseInt(await readHud(page, "travel"), 10) || 0;
  let progressionSeen = false;
  let reachedOrigin = false;
  let lastTravel = t0;
  for (let i = 0; i < 6000; i += 1) {
    await page.keyboard.press("Space");
    if (i % 40 === 39) {
      const t = parseInt(await readHud(page, "travel"), 10) || 0;
      if (t < lastTravel) progressionSeen = true;
      lastTravel = t;
      if (t === 0) {
        reachedOrigin = true;
        break;
      }
    }
  }
  record(vp, "I. rewind progression (travel decreases under Space)", progressionSeen, `travel ${t0} -> ${lastTravel}`);
  record(vp, "J. full-state rewind reaches origin (travel 0)", reachedOrigin, `travel ${t0} -> ${lastTravel}`);
}

async function runViewportMatrix(browser, vp) {
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
  await page.waitForFunction(() => Boolean(window.__track67Native), undefined, { timeout: 15000 });
  record(vp.name, "A. native Track67 route loads", true);

  // Prove the live tail while the world is sparse and the tail is genuinely
  // observable. Then prove no-hit and static/frontmost contracts before the
  // long persistence phase. This preserves every acceptance contract while
  // removing the old blind-grid sampling dependence.
  await runTailProof(page, vp.name); // F
  await runSparseNoHitControl(page, vp.name); // E2
  await runChunkAndFrontmostProofs(page, vp.name); // E + F2
  await runPersistence(page, vp.name); // G + H
  await runWorks(page, vp.name); // K + K2

  const overflow = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  );
  record(vp.name, "B. horizontal overflow 0", overflow === 0, `overflow px: ${overflow}`);

  // Rewind on a FRESH page in the same context so history is small and
  // origin-bound; errors on this page count against the same strict gate.
  const page2 = await ctx.newPage();
  page2.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page2.on("pageerror", (e) => pageErrors.push(e.message));
  await page2.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  await page2.locator("canvas.lt67-native__canvas").waitFor({ timeout: 15000 });
  await waitFor(page2, async () => (parseInt(await readHud(page2, "static chunks"), 10) >= 1 ? true : null), 120000);
  await runRewind(page2, vp.name);

  record(vp.name, "C. console error 0", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
  record(vp.name, "D. page error 0", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  await ctx.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // Full A–K matrix on ALL THREE viewports, in PARALLEL contexts (each page
  // runs its own client-side simulation; wall-clock stays bounded).
  await Promise.all(VIEWPORTS.map((vp) => runViewportMatrix(browser, vp)));

  // Reduced-motion (desktop): autoplay blocked, route renders, no errors.
  {
    const vp = VIEWPORTS[0];
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: "reduce" });
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
