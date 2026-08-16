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
// 320x720) — desktop AND mobile now run the SAME depth (persistence, oldest
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
// The native route exposes bounded read-only observability (no fabricated
// hit): canvas[data-hit-kind] / [data-hit-surface-id] / [data-hit-distance] /
// [data-hit-candidate-count] / [data-hit-candidates], all derived from the
// ACTUAL pointer ray → AABB → ribbon-triangle hit-test. The QA clicks grids of
// REAL canvas pixels, so every hit is computed by the production pipeline —
// never injected. The drawn spiral sits behind/around the forward-facing
// camera, so surfaces are hittable at some orientations only; the harness
// polls the evolving world until each proof lands — viewport-independent, no
// narrow-viewport exemption, no try/catch→PASS.

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

// One grid pass of REAL pointer clicks (8x12 interior canvas points). Returns
// the first dataset satisfying `accept`, or null. Chunk hits open an inspect
// dialog; it is closed so the canvas remains the click target.
async function scanGridUntil(page, accept) {
  const box = await page.locator("canvas.lt67-native__canvas").boundingBox();
  if (!box) return null;
  const xSteps = 8;
  const ySteps = 12;
  for (let xi = 0; xi < xSteps; xi += 1) {
    for (let yi = 0; yi < ySteps; yi += 1) {
      const px = (box.width * (xi + 1.5)) / (xSteps + 1);
      const py = (box.height * (yi + 1.5)) / (ySteps + 1);
      await clickCanvasPixel(page, px, py);
      await page.waitForTimeout(40);
      const ds = await readCanvasDataset(page);
      if (ds && accept(ds)) return ds;
      if ((await page.locator(".lt67-native__inspect").count()) > 0) {
        await page.getByRole("button", { name: "닫기" }).click().catch(() => {});
        await page.waitForTimeout(60);
      }
    }
  }
  return null;
}

// E + F + F2 proofs, all through REAL pointer clicks on the evolving world.
// Runs AFTER persistence so >112 overlapping chunks exist (frontmost
// multi-candidate rays are common then). No synthetic injection: the accept
// predicates only READ what the production hit-test actually computed.
async function runHitProofs(page, vp) {
  const found = { chunk: null, tail: null, frontmost: null };
  const consider = (ds) => {
    if (!found.chunk && ds.hitKind === "chunk" && ds.surfaceId !== "") found.chunk = ds;
    if (!found.tail && ds.hitKind === "tail") found.tail = ds;
    if (!found.frontmost) {
      const cands = parseCandidates(ds.candidates);
      const count = Number(ds.candidateCount || 0);
      if (count >= 2 && cands.length >= 2 && ds.surfaceId !== "") {
        const selId = ds.surfaceId;
        const selDist = Number(ds.distance);
        if (String(cands[0].id) === String(selId) && Math.abs(cands[0].t - selDist) < 1e-6 && cands[0].t <= cands[1].t) {
          found.frontmost = ds;
        }
      }
    }
  };
  const deadline = Date.now() + 150000;
  while (Date.now() < deadline && (!found.chunk || !found.tail || !found.frontmost)) {
    const got = await scanGridUntil(page, (ds) => {
      consider(ds);
      return Boolean(found.chunk && found.tail && found.frontmost);
    });
    if (got) break;
    await page.waitForTimeout(350);
  }

  record(vp, "E. static chunk positive hit (real pointer)", Boolean(found.chunk),
    found.chunk ? `surface ${found.chunk.surfaceId} @ t=${found.chunk.distance}` : "no chunk hit in window");
  record(vp, "F. active tail positive hit (real pointer)", Boolean(found.tail),
    found.tail ? `tail surface ${found.tail.surfaceId} @ t=${found.tail.distance}` : "no tail hit in window");
  record(
    vp,
    "F2. frontmost/nearest selection (real pointer, >=2 positive candidates)",
    Boolean(found.frontmost),
    found.frontmost
      ? `selected ${found.frontmost.surfaceId} @ ${found.frontmost.distance}; candidates ${found.frontmost.candidates}`
      : "no multi-candidate ray in window",
  );

  // Negative control: empty-space click -> no hit.
  await clickCanvasPixel(page, 2, 2);
  await page.waitForTimeout(120);
  const ds = await readCanvasDataset(page);
  record(vp, "E2. empty-space click -> no hit", ds?.hitKind === "none", `hitKind=${ds?.hitKind}`);
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
  record(vp.name, "A. native Track67 route loads", true);

  await runPersistence(page, vp.name); // G + H (also grows overlap for hit proofs)
  await runHitProofs(page, vp.name); // E + F + F2 + E2
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
