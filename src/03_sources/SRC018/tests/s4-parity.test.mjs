/**
 * SRC018 S4 — Context-Aware Original/Split Parity (SOURCE-LOCAL ONLY).
 *
 * SRC018 is CONTEXT_AWARE_ONLY: the shared single-executable baseline/parity
 * harnesses SKIP it. This test is the SRC018-local context-aware runner that
 * CENTRAL released for S4. It hydrates the SAME exact eight runtime PNGs into
 * two isolated virtual roots (ORIGINAL = verbatim authority single file,
 * SPLIT = mechanical index+css+js) and replays the CENTRAL-accepted S2 matrix:
 *
 *   states    : INTRO(/) SIGNAL(/?preview=10) FRAGMENTS(/?preview=35)
 *               BLOOM(/?preview=65) READY(/?preview=complete)
 *   viewports : 1280x800, 390x844, 320x720   deviceScaleFactor = 1
 *   capture   : prefers-reduced-motion = reduce (deterministic visual parity)
 *   liveness  : prefers-reduced-motion = no-preference (separate proof)
 *
 * 15 ORIGINAL + 15 SPLIT matched pairs. Every channel must be EQUAL and every
 * screenshot pair must be RAW PNG BYTE_IDENTICAL. No tolerance is introduced.
 * If a PNG pair differs the run STOPS and preserves both shots + a diff and the
 * lane disposition becomes HOLD_VISUAL_PARITY_DIFF.
 *
 * This test performs NO self-acceptance: it never flips source_split_parity_pass,
 * parity_ref, or any Ready/merge/CENTRAL_VISUAL state. It only reports.
 *
 * Writes evidence to a directory OUTSIDE the repository (temp/Drive), never the
 * working tree. No commits. No pushes.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import {
  buildRoots, startServer, waitForStable, SRC18_STATE, sha256, RUNTIME_ASSETS,
} from "./lib/s4-context-runner.mjs";
import { getCaptureSurfaceDisposition } from "../../../08_harness/capture-surface.mjs";

const CAPSULE = path.join(import.meta.dirname, "..");
const EVIDENCE_DIR = process.env.SRC018_S4_EVIDENCE_DIR || path.join(os.tmpdir(), "src018-s4-evidence");
const TMP_ROOT = process.env.SRC018_S4_TMP || path.join(os.tmpdir(), "src018-s4-roots");
const SHOT_DIR = path.join(EVIDENCE_DIR, "screenshots");

const AUTHORITY_BYTES = 25427;
const AUTHORITY_SHA = "680c6ddb8e6ee7c252182f84523d4a66971e96fd6c177b3e72d1e0487b5dabe0";
const TRACK17_HREF = "../../17_러브트리_글로벌셸_롤링메뉴_V1/최종본.html";
const TRACK17_RESOLVED = "/17_러브트리_글로벌셸_롤링메뉴_V1/최종본.html";

const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
  { width: 320, height: 720 },
];
const STATES = [
  { name: "INTRO", path: "/" },
  { name: "SIGNAL", path: "/?preview=10" },
  { name: "FRAGMENTS", path: "/?preview=35" },
  { name: "BLOOM", path: "/?preview=65" },
  { name: "READY", path: "/?preview=complete" },
];

let passed = 0, failed = 0;
const checks = [];
function ok(cond, id, detail) {
  checks.push({ id, pass: !!cond, detail: detail || "" });
  if (cond) { passed++; console.log(`  \u2713 ${id}${detail ? " — " + detail : ""}`); }
  else { failed++; console.log(`  \u2717 FAIL: ${id}${detail ? " — " + detail : ""}`); }
}
function normState(s) {
  const c = JSON.parse(JSON.stringify(s));
  for (const k of Object.keys(c.perfAssets || {})) delete c.perfAssets[k].transfer;
  return c;
}
// Order-insensitive canonical comparison. perfAssets is keyed by filename but its
// insertion order follows performance resource-entry arrival, which differs between
// the two surfaces (SPLIT additionally fetches styles.css/script.js). Sorting object
// keys recursively compares the set of key->value facts, not an incidental serialize
// order. Array order (DOM-derived fragments/portalImgs) is preserved and still checked.
function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v).sort()) o[k] = canonical(v[k]);
    return o;
  }
  return v;
}
const eq = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const r3 = (x) => (x === null || x === undefined || x === "" ? x : String(Math.round(parseFloat(x) * 1000) / 1000));

async function capture(browser, origin, statePath, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await context.newPage();
  const consoleErrors = [], pageErrors = [], failedRequests = [], responses = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => pageErrors.push(String(e.message)));
  page.on("requestfailed", (r) => failedRequests.push({ url: r.url(), failure: r.failure() && r.failure().errorText }));
  page.on("response", (r) => responses.push({ url: r.url(), status: r.status() }));
  const resp = await page.goto(origin + statePath, { waitUntil: "load", timeout: 30000 });
  const httpOk = resp && resp.ok();
  await waitForStable(page);
  const state = await page.evaluate(SRC18_STATE);
  // Quiescence: capture repeatedly until two consecutive frames are byte-identical,
  // guaranteeing we sample a fully-painted, static state (eliminates decode/paint
  // races on the externally-loaded SPLIT surface). No pixel tolerance is introduced.
  let png = await page.screenshot({ animations: "disabled" });
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.waitForTimeout(120);
    const next = await page.screenshot({ animations: "disabled" });
    if (Buffer.compare(png, next) === 0) { png = next; break; }
    png = next;
  }
  const track17 = {
    closeBtn: await page.getAttribute("#closeBtn", "href"),
    enterBtn: await page.getAttribute("#enterBtn", "href"),
  };
  await context.close();
  return { httpOk, state, png, consoleErrors, pageErrors, failedRequests, responses, track17 };
}

function classifyFailures(cap) {
  const unexpected = [];
  let track17Hold = false, favicon = 0;
  for (const r of cap.responses) {
    const p = new URL(r.url).pathname;
    if (p === "/favicon.ico") { favicon++; continue; }
    if (r.status >= 400) {
      if (p === TRACK17_RESOLVED) { track17Hold = true; continue; }
      unexpected.push({ url: r.url, status: r.status });
    }
  }
  for (const f of cap.failedRequests) {
    const p = new URL(f.url).pathname;
    if (p === "/favicon.ico") continue;
    if (p === TRACK17_RESOLVED) { track17Hold = true; continue; }
    unexpected.push({ url: f.url, failure: f.failure });
  }
  return { unexpected, track17Hold, favicon, consoleErrors: cap.consoleErrors, pageErrors: cap.pageErrors };
}

function assetLoadOk(state) {
  const loaded = RUNTIME_ASSETS.map((n) => {
    const e = state.perfAssets[n];
    return e && e.status === 200 && e.decoded > 0;
  });
  return { count: loaded.filter(Boolean).length, all: loaded.every(Boolean), per: state.perfAssets };
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(CAPSULE, "manifest.json"), "utf8"));

  console.log("\n=== SRC018 S4 Context-Aware Parity ===\n");

  // Gate 0: we rely on the generic harness SKIPping SRC018 (context-aware only).
  const disp = getCaptureSurfaceDisposition({ manifest });
  ok(disp && disp.action === "SKIP" && disp.reason === "CONTEXT_AWARE_SURFACE_ONLY",
    "G0", "generic baseline/parity disposition = SKIP (context-aware runner required)");

  // Gate 1: authority + hydrated asset bytes match the manifest pins.
  const origBytes = fs.readFileSync(path.join(CAPSULE, "original", "original.html"));
  ok(origBytes.length === AUTHORITY_BYTES && sha256(origBytes) === AUTHORITY_SHA,
    "G1a", `authority original locked (${origBytes.length} B)`);
  const pinMap = Object.fromEntries(manifest.runtime_assets.pinned.map((p) => [p.filename, p]));
  ok(manifest.runtime_assets.pinned.length === 8 && RUNTIME_ASSETS.every((n) => pinMap[n]),
    "G1b", "manifest pins exactly the eight cyber runtime assets");

  // Build isolated roots.
  const { originalRoot, splitRoot, assetMap } = buildRoots({ capsuleDir: CAPSULE, tmpRoot: TMP_ROOT });
  const hydrateOk = RUNTIME_ASSETS.every((n) => assetMap[n].bytes === pinMap[n].bytes && assetMap[n].sha256 === pinMap[n].sha256);
  ok(hydrateOk, "G2", "both roots hydrated with the exact eight authority PNG bytes (no re-encode)");

  const oSrv = await startServer(originalRoot);
  const sSrv = await startServer(splitRoot);
  console.log(`  ORIGINAL_ROOT ${oSRv_origin(oSrv)}   SPLIT_ROOT ${oSRv_origin(sSrv)}`);
  function oSRv_origin(s) { return s.origin; }

  const browser = await chromium.launch();
  const matrix = [];
  let visualDiff = false;

  // ---- Visual parity matrix: 5 states x 3 viewports ----
  console.log("\nMatched-pair matrix (ORIGINAL vs SPLIT):");
  for (const vp of VIEWPORTS) {
    const label = `${vp.width}x${vp.height}`;
    for (const st of STATES) {
      const o = await capture(browser, oSrv.origin, st.path, vp);
      const s = await capture(browser, sSrv.origin, st.path, vp);
      const oId = `${label}-${st.name}-original.png`, sId = `${label}-${st.name}-split.png`;
      fs.writeFileSync(path.join(SHOT_DIR, oId), o.png);
      fs.writeFileSync(path.join(SHOT_DIR, sId), s.png);
      const oSha = sha256(o.png), sSha = sha256(s.png);
      const pngIdentical = Buffer.compare(o.png, s.png) === 0;
      if (!pngIdentical) {
        visualDiff = true;
        fs.mkdirSync(path.join(EVIDENCE_DIR, "diffs"), { recursive: true });
        fs.writeFileSync(path.join(EVIDENCE_DIR, "diffs", `${label}-${st.name}-original.png`), o.png);
        fs.writeFileSync(path.join(EVIDENCE_DIR, "diffs", `${label}-${st.name}-split.png`), s.png);
      }
      const oState = normState(o.state), sState = normState(s.state);
      const runtimeEqual = eq(oState, sState);
      const oHealth = classifyFailures(o), sHealth = classifyFailures(s);
      const oAssets = assetLoadOk(o.state), sAssets = assetLoadOk(s.state);
      const id = `${label}/${st.name}`;
      ok(o.httpOk && s.httpOk, `HTTP:${id}`, "both surfaces 200");
      ok(runtimeEqual, `STATE:${id}`, runtimeEqual ? "runtime/DOM/geometry/computed EQUAL" : "RUNTIME DIFF");
      ok(pngIdentical, `PNG:${id}`, pngIdentical ? `byte-identical (${o.png.length} B, sha ${oSha.slice(0, 12)})` : `DIFF orig=${oSha.slice(0, 12)} split=${sSha.slice(0, 12)}`);
      ok(oAssets.all && sAssets.all && oAssets.count === 8 && sAssets.count === 8, `ASSETS:${id}`, `8/8 loaded both surfaces`);
      ok(oHealth.unexpected.length === 0 && sHealth.unexpected.length === 0 && oHealth.consoleErrors.length === 0 && sHealth.consoleErrors.length === 0 && oHealth.pageErrors.length === 0 && sHealth.pageErrors.length === 0,
        `HEALTH:${id}`, `0 unexpected-fail / 0 console / 0 page errors (favicon 204 excluded; Track17 held)`);
      matrix.push({
        viewport: label, state: st.name,
        pngIdentical, originalSha: oSha, splitSha: sSha, pngBytes: o.png.length,
        runtimeEqual,
        original: { progress: o.state.progress, count: o.state.count, stageNo: o.state.stageNo, phase: o.state.phase, stage: o.state.stage, ready: o.state.readyClass, introDisplay: o.state.introDisplay, portalOpacity: o.state.portalOpacity, fragmentCount: o.state.fragmentCount, seedCount: o.state.seedCount, scrollX: o.state.scrollX, scrollY: o.state.scrollY, appElementCount: o.state.appElementCount, assets: oAssets.count },
        split: { progress: s.state.progress, count: s.state.count, stageNo: s.state.stageNo, phase: s.state.phase, stage: s.state.stage, ready: s.state.readyClass, introDisplay: s.state.introDisplay, portalOpacity: s.state.portalOpacity, fragmentCount: s.state.fragmentCount, seedCount: s.state.seedCount, scrollX: s.state.scrollX, scrollY: s.state.scrollY, appElementCount: s.state.appElementCount, assets: sAssets.count },
        health: { originalUnexpected: oHealth.unexpected, splitUnexpected: sHealth.unexpected, originalConsole: oHealth.consoleErrors, splitConsole: sHealth.consoleErrors, originalPage: oHealth.pageErrors, splitPage: sHealth.pageErrors },
      });
    }
  }

  // ---- Track17 mapping HOLD (attribute preserved, never repaired) ----
  console.log("\nTrack17 source-local mapping HOLD:");
  const t17 = matrix.length ? await capture(browser, oSrv.origin, "/", VIEWPORTS[0]) : null;
  const t17s = await capture(browser, sSrv.origin, "/", VIEWPORTS[0]);
  ok(t17.track17.closeBtn === TRACK17_HREF && t17.track17.enterBtn === TRACK17_HREF,
    "T17-orig", `ORIGINAL close+enter href = source-local path (EXPECTED_SOURCE_LOCAL_MAPPING_HOLD)`);
  ok(t17s.track17.closeBtn === TRACK17_HREF && t17s.track17.enterBtn === TRACK17_HREF,
    "T17-split", `SPLIT close+enter href = source-local path (EXPECTED_SOURCE_LOCAL_MAPPING_HOLD)`);

  // ---- Interaction parity (desktop viewport; observable outcomes must match) ----
  console.log("\nInteraction parity:");
  await runInteractions(browser, oSrv.origin, sSrv.origin);

  // ---- Liveness proof (no-preference; separate from visual parity) ----
  console.log("\nLiveness (prefers-reduced-motion = no-preference):");
  await runLiveness(browser, oSrv.origin, sSrv.origin);

  await browser.close();
  oSrv.server.close();
  sSrv.server.close();

  // ---- Frozen defects D1-D4 preserved (no repair) ----
  console.log("\nFrozen defects preserved:");
  const css = fs.readFileSync(path.join(CAPSULE, "split", "styles.css"), "utf8");
  const js = fs.readFileSync(path.join(CAPSULE, "split", "script.js"), "utf8");
  const shell = fs.readFileSync(path.join(CAPSULE, "split", "index.html"), "utf8");
  ok(shell.includes(TRACK17_HREF) && !/http/.test(shell.match(/id="closeBtn"[^>]*href="([^"]+)"/)[1]), "D1", "Track17 source-local href intact (not rewritten to a repo route)");
  ok(/duration=6800/.test(js) && /prefers-reduced-motion:reduce/.test(css), "D2", "reduced-motion CSS vs fixed 6800ms JS duration both present (unrepaired)");
  ok(!/focus-visible|:focus\b|outline\s*:\s*(solid|auto)/.test(css), "D3", "no focus-visible / focus containment added");
  ok(!/role=["']progressbar|aria-valuenow/.test(shell), "D4", "no native progressbar semantics added");

  // ---- Evidence ----
  const runtime = {
    schema_version: "1.0", source_id: "SRC018", stage: "S4_CONTEXT_AWARE_PARITY",
    run_at: new Date().toISOString(),
    authority: { bytes: AUTHORITY_BYTES, sha256: AUTHORITY_SHA },
    capture_surface: { mode: manifest.capture_surface.mode, required_serving: manifest.capture_surface.required_serving, generic_disposition: disp },
    roots: { original: oSrv.origin, split: sSrv.origin, hydrated_assets: assetMap },
    viewports: VIEWPORTS.map((v) => `${v.width}x${v.height}`), states: STATES.map((s) => s.name),
    matched_pairs: matrix.length,
    screenshots_dir: SHOT_DIR,
  };
  fs.writeFileSync(path.join(EVIDENCE_DIR, "runtime.json"), JSON.stringify(runtime, null, 2) + "\n");
  fs.writeFileSync(path.join(EVIDENCE_DIR, "comparison.json"), JSON.stringify({ source_id: "SRC018", matrix }, null, 2) + "\n");

  const allPng = matrix.every((m) => m.pngIdentical);
  const allState = matrix.every((m) => m.runtimeEqual);
  const allAssets = matrix.every((m) => m.original.assets === 8 && m.split.assets === 8);
  const allHealth = matrix.every((m) => m.health.originalUnexpected.length === 0 && m.health.splitUnexpected.length === 0 && m.health.originalConsole.length === 0 && m.health.splitConsole.length === 0 && m.health.originalPage.length === 0 && m.health.splitPage.length === 0);

  console.log(`\n=== S4 matrix: ${matrix.length} pairs | PNG byte-identical=${allPng} | runtime equal=${allState} | assets 8/8=${allAssets} | health=${allHealth} ===`);
  console.log(`=== Results: ${passed} passed, ${failed} failed ===\n`);

  if (visualDiff) {
    console.log("HOLD_VISUAL_PARITY_DIFF — one or more PNG pairs differ; both shots preserved under evidence/diffs/. No tolerance introduced.");
    process.exitCode = 2;
    return;
  }
  process.exitCode = failed > 0 ? 1 : 0;
}

async function runInteractions(browser, oOrigin, sOrigin) {
  const vp = VIEWPORTS[0];
  const scenario = async (origin, reduced) => {
    const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, reducedMotion: reduced ? "reduce" : "no-preference" });
    const page = await context.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e.message)));
    await page.goto(origin + "/", { waitUntil: "load" });
    await waitForStable(page);
    // Wait until the JS rAF ease (progress += (target-progress)*.095, running=false)
    // has converged, so we compare the SETTLED target rather than a sampled frame.
    const settle = () => page.waitForFunction(() => new Promise((res) => {
      let last = null, stable = 0;
      const chk = () => {
        const v = parseFloat(document.documentElement.style.getPropertyValue("--progress"));
        if (last !== null && Math.abs(v - last) < 1e-5) { if (++stable >= 2) return res(true); } else stable = 0;
        last = v; requestAnimationFrame(chk);
      };
      requestAnimationFrame(chk);
    }), null, { timeout: 8000 });
    const readApp = () => page.evaluate(() => ({
      introHidden: document.getElementById("intro").classList.contains("hidden"),
      ready: document.getElementById("app").classList.contains("ready"),
      soundPressed: document.getElementById("soundBtn").getAttribute("aria-pressed"),
      soundText: document.getElementById("soundText").textContent,
      progress: document.documentElement.style.getPropertyValue("--progress"),
      count: document.getElementById("count").textContent,
      mx: document.documentElement.style.getPropertyValue("--mx"),
      my: document.documentElement.style.getPropertyValue("--my"),
    }));
    const out = {};
    const waitComplete = () => page.waitForFunction(() => document.getElementById("app").classList.contains("ready"), null, { timeout: 9000 });
    // START: intro hides, sound auto-on, ready cleared (all synchronous). That the
    // animation actually advances is proven separately by the liveness probe.
    await page.click("#startBtn");
    const a0 = await readApp();
    out.afterStart = { introHidden: a0.introHidden, soundPressed: a0.soundPressed, soundText: a0.soundText, ready: a0.ready };
    // ANCHOR: let the intro animation finish. running auto-clears at progress>=1,
    // leaving target=progress=1, ready=true, running=false — a deterministic base.
    await waitComplete(); await settle();
    out.complete = { progress: r3((await readApp()).progress), ready: (await readApp()).ready };
    // ABOUT toggle from anchored target=1: 1 -> 0 -> 1 (settled, deterministic).
    await page.click("#aboutBtn"); await settle(); const ab1 = await readApp();
    await page.click("#aboutBtn"); await settle(); const ab2 = await readApp();
    out.about = { after1: r3(ab1.progress), after2: r3(ab2.progress) };
    // WHEEL scrub from target=1: down clamps to 1, up -> 1-0.42=0.58 (settled).
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, 600); await settle(); const wheelDown = await readApp();
    await page.mouse.wheel(0, -600); await settle(); const wheelUp = await readApp();
    out.wheel = { downProgress: r3(wheelDown.progress), upProgress: r3(wheelUp.progress) };
    // KEYBOARD from target=0.58: ArrowRight -> 0.66, ArrowLeft -> 0.58 (settled); s toggles sound.
    await page.keyboard.press("ArrowRight"); await settle(); const ar = await readApp();
    await page.keyboard.press("ArrowLeft"); await settle(); const al = await readApp();
    await page.keyboard.press("s"); const sk = await readApp();
    out.keyboard = { arrowRight: r3(ar.progress), arrowLeft: r3(al.progress), sSound: sk.soundPressed };
    // SPACE replays from hidden intro (start() resets progress, clears ready): booleans.
    await page.keyboard.press(" "); const sp = await readApp();
    out.space = { introHidden: sp.introHidden, ready: sp.ready };
    // REPLAY button: start() re-arms (intro hidden, ready cleared synchronously).
    await page.click("#replayBtn");
    const rp0 = await readApp();
    out.afterReplay = { introHidden: rp0.introHidden, ready: rp0.ready };
    // SOUND cycle (aria-pressed + label text) — deterministic toggles.
    await page.click("#soundBtn"); const snd1 = await readApp();
    await page.click("#soundBtn"); const snd2 = await readApp();
    await page.click("#soundBtn"); const snd3 = await readApp();
    out.sound = { p1: snd1.soundPressed, p2: snd2.soundPressed, p3: snd3.soundPressed, text: snd2.soundText };
    // PARALLAX: fixed coordinate -> --mx/--my set synchronously by pointermove.
    await page.mouse.move(500, 300); await page.waitForTimeout(120);
    const px = await readApp();
    out.parallax = { mx: px.mx, my: px.my };
    out.errors = errs;
    await context.close();
    return out;
  };
  const o = await scenario(oOrigin, true);
  const s = await scenario(sOrigin, true);
  // compare observable interaction outcomes
  const cmp = (name, a, b) => ok(eq(a, b), `INT:${name}`, eq(a, b) ? "outcome EQUAL" : `DIFF ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  cmp("start", o.afterStart, s.afterStart);
  cmp("complete-anchor", o.complete, s.complete);
  cmp("about", o.about, s.about);
  cmp("wheel", o.wheel, s.wheel);
  cmp("keyboard", o.keyboard, s.keyboard);
  cmp("space", o.space, s.space);
  cmp("replay", o.afterReplay, s.afterReplay);
  cmp("sound-cycle", o.sound, s.sound);
  cmp("parallax", o.parallax, s.parallax);
  ok(o.errors.length === 0 && s.errors.length === 0, "INT:errors", "no page errors during interaction on either surface");
  globalThis.__S4_INTERACTION__ = { original: o, split: s };
}

async function runLiveness(browser, oOrigin, sOrigin) {
  const vp = VIEWPORTS[0];
  const probe = async (origin) => {
    const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, reducedMotion: "no-preference" });
    const page = await context.newPage();
    await page.goto(origin + "/", { waitUntil: "load" });
    await waitForStable(page);
    await page.click("#startBtn");
    const samples = [];
    for (let i = 0; i < 4; i++) { samples.push(await page.evaluate(() => document.documentElement.style.getPropertyValue("--progress"))); await page.waitForTimeout(300); }
    const nums = samples.map(Number);
    const advancing = nums[nums.length - 1] > nums[0];
    await context.close();
    return { samples, advancing };
  };
  const o = await probe(oOrigin), s = await probe(sOrigin);
  ok(o.advancing && s.advancing, "LIVE:progress", `progress advances after start on both surfaces (orig ${o.samples[0]}->${o.samples[3]}, split ${s.samples[0]}->${s.samples[3]})`);
  globalThis.__S4_LIVENESS__ = { original: o, split: s };
}

main().then(() => {
  // persist interaction + liveness evidence
  try {
    fs.writeFileSync(path.join(EVIDENCE_DIR, "interaction-record.json"), JSON.stringify({
      interaction: globalThis.__S4_INTERACTION__ || null,
      liveness: globalThis.__S4_LIVENESS__ || null,
    }, null, 2) + "\n");
  } catch {}
  process.exit(process.exitCode || (failed > 0 ? 1 : 0));
}).catch((e) => { console.error("S4 RUNNER ERROR:", e); process.exit(3); });
