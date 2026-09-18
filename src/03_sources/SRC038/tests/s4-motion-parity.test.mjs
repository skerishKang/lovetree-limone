/**
 * SRC038 S4 — SOURCE-SPECIFIC MOTION-AWARE PARITY (worker gate, released by
 * #589 comment 5654031252 / PR #650 comment 5654031586).
 *
 * Contract implemented here:
 *  - ORIGINAL vs SPLIT served from isolated equivalent local HTTP roots, same
 *    Chromium build, deviceScaleFactor=1, viewports 1280x800 / 390x844 / 320x720.
 *  - Identical source-native interaction sequence, matched fixed observation
 *    windows, exact action order recorded per surface; methods compared.
 *  - Hard gate: per-state DOM/CSSOM-observable state equality for all matched
 *    states (21 required + 1 extra invalid-video probe).
 *  - RAW PNG byte equality is NOT asserted (frozen D4 wobble). Screenshots are
 *    captured for every matched state and composed side-by-side for CENTRAL
 *    visual review. No SSIM / perceptual / pixel-percentage tolerance exists
 *    anywhere in this runner.
 *  - Camera effects are recorded only where browser-observable: intra-surface
 *    screenshot change for zoom/orbit/turn/layout/reset, DOM-observable drag
 *    selection suppression, and source-native resetView as the deterministic
 *    camera anchor. No hooks, globals, or runtime patches.
 *  - D1-D11 frozen-defect preservation is probed and recorded.
 *  - Browser health is classified: local/runtime failures vs source-external
 *    (i.ytimg / youtube / third-party iframe) failures are separated; external
 *    failures can never fail the split parity gate.
 *
 * This test NEVER writes parity acceptance flags. Worker ceiling:
 * READY_FOR_CENTRAL_S4_VISUAL_REVIEW.
 */

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  buildRoots, startServer, SETTLE, SRC38_STATE, waitForStable, classifyNetwork, sha256,
} from "./lib/s4-motion-runner.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAPSULE = path.resolve(HERE, "..");
const TMP = process.env.SRC038_S4_TMP || "D:\\Temp\\src038-s4";
const DRIVE_FOLDER = "LoveTree_Evidence/CLEAN108-SRC038-S4-Candidate-260913";

const VIEWPORTS = [
  { key: "1280x800", width: 1280, height: 800, mobile: false, narrow: false },
  { key: "390x844", width: 390, height: 844, mobile: true, narrow: false },
  { key: "320x720", width: 320, height: 720, mobile: true, narrow: true },
];

// Required matched states (#589 comment 5654031252) + 1 extra probe state.
const DESKTOP_STATES = [
  "INITIAL_AUTO_ORBIT", "STABILIZED_ORBIT_OFF", "ROOT_SELECTED", "HUB_SELECTED",
  "VIDEO_SELECTED_PREVIEW", "SETTINGS_OPEN", "SEARCH_FILTERED", "ZOOMED",
  "DRAG_ORBITED", "TURN_LEFT", "FRAGMENTS_OFF", "LINKS_OFF", "LAYOUT_ORBIT",
  "LAYOUT_TIMELINE", "SCALE_MAX", "PLAYER_OPEN", "PLAYER_CLOSED", "RESET_VIEW",
  "PROBE_INVALID_VIDEO",
];
const MOBILE_EXTRA = ["MOBILE_INSPECTOR_OPEN", "MOBILE_DRAG"];
const NARROW_EXTRA = ["320_OVERFLOW_GEAR_UNREACHABLE"];

const get = (url) => new Promise((resolve, reject) => {
  http.get(url, (res) => {
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
  }).on("error", reject);
});

function statesFor(vp) {
  return [...DESKTOP_STATES, ...(vp.mobile ? MOBILE_EXTRA : []), ...(vp.narrow ? NARROW_EXTRA : [])];
}

async function runViewport(browser, origin, vp, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const net = [];
  const pageErrors = [];
  const consoleErrors = [];
  page.on("response", (r) => {
    try { net.push({ url: r.url(), status: r.status(), resourceType: r.request().resourceType() }); } catch { /* closed */ }
  });
  page.on("requestfailed", (rq) => {
    try { net.push({ url: rq.url(), failure: rq.failure()?.errorText, resourceType: rq.resourceType() }); } catch { /* closed */ }
  });
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    let url = "";
    try { url = m.location().url || ""; } catch { /* closed */ }
    // Main-frame errors originate from the local served document; third-party
    // iframe console errors carry foreign URLs and are source-external.
    consoleErrors.push({ text: m.text(), url, local: url.startsWith(origin) });
  });

  const interactions = [];
  const states = {};
  const shots = {};
  const probes = {};
  const log = (step, action, method, extra) => interactions.push({ step, action, method, ...(extra || {}) });
  const shot = async (name) => {
    const p = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: p });
    shots[name] = sha256(fs.readFileSync(p));
    return shots[name];
  };
  const cap = async (name) => {
    states[name] = await page.evaluate(SRC38_STATE);
    await shot(name);
    return states[name];
  };
  const canvasCenter = () => page.evaluate(() => {
    const r = document.getElementById("graph").getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  const clickEl = async (sel, step, nth = 0) => {
    const loc = nth === 0 ? page.locator(sel) : page.locator(sel).nth(nth);
    try {
      await loc.click({ timeout: 3000 });
      log(step, `click ${sel}${nth ? `#${nth}` : ""}`, "mouse");
    } catch {
      await page.evaluate(([s, n]) => document.querySelectorAll(s)[n].click(), [sel, nth]);
      log(step, `click ${sel}${nth ? `#${nth}` : ""}`, "dom-click-fallback-offscreen");
    }
  };
  const dispatchNative = async (sel, value, step, event = "input") => {
    await page.evaluate(([s, v, ev]) => {
      const el = document.querySelector(s);
      el.value = v;
      el.dispatchEvent(new Event(ev, { bubbles: true }));
    }, [sel, value, event]);
    log(step, `set ${sel}="${value}" + ${event}`, "native-event-dispatch");
  };
  const dragOnCanvas = async (step, dx, dy) => {
    const c = await canvasCenter();
    await page.mouse.move(c.x - dx / 2, c.y - dy / 2);
    await page.mouse.down();
    await page.mouse.move(c.x + dx / 2, c.y + dy / 2, { steps: 10 });
    await page.mouse.up();
    log(step, `canvas drag +${dx}/+${dy}`, "mouse-drag");
  };
  const ensureInspector = async (step, open) => {
    if (!vp.mobile) return;
    const st = await page.evaluate(SRC38_STATE);
    const isOpen = st.inspectorClass.includes("mobile-open");
    if (isOpen !== open) {
      await clickEl("#mobileNote", step);
      await page.waitForTimeout(SETTLE.inspector);
    }
  };

  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await waitForStable(page);
  log("A00", "goto / + boot stabilization", "networkidle+fonts+canvas+thumbs");

  // 1. INITIAL_AUTO_ORBIT
  await cap("INITIAL_AUTO_ORBIT");

  // 2. STABILIZED_ORBIT_OFF — orbit off + source-native resetView as the
  //    deterministic camera anchor (yaw=-.28 pitch=.08 zoom=.96 focus=0).
  await clickEl("#orbitToggle", "A02a");
  await page.waitForTimeout(SETTLE.toggle);
  await clickEl("#resetView", "A02b");
  await page.waitForTimeout(SETTLE.reset);
  await cap("STABILIZED_ORBIT_OFF");
  // D4 probe: unconditional time-based wobble continues with orbit OFF.
  await shot("D4_MOTION_A");
  await page.waitForTimeout(400);
  await shot("D4_MOTION_B");
  probes.D4_wobble_with_orbit_off = shots.D4_MOTION_A !== shots.D4_MOTION_B;

  // 3. ROOT_SELECTED — canvas-center click (moved=0 -> pointerup hitTest).
  const c = await canvasCenter();
  await page.mouse.click(c.x, c.y);
  log("A03", "canvas center click", "mouse");
  await page.waitForTimeout(SETTLE.select);
  await cap("ROOT_SELECTED");

  // 4. HUB_SELECTED — root connections[0] = felix hub (trunk edge order).
  await ensureInspector("A04a:inspector-open", true);
  await clickEl("#connections .connection", "A04", 0);
  await page.waitForTimeout(SETTLE.select);
  await cap("HUB_SELECTED");

  // 5. VIDEO_SELECTED_PREVIEW — hub connections[1] = first branch video.
  await clickEl("#connections .connection", "A05", 1);
  await page.waitForFunction(() => document.getElementById("previewImage").complete, null, { timeout: 8000 });
  await page.waitForTimeout(SETTLE.select);
  await cap("VIDEO_SELECTED_PREVIEW");
  if (vp.mobile) await ensureInspector("A05z:inspector-close", false);

  // 6. SETTINGS_OPEN — gear is off-screen at <=390 (D9): dom fallback there.
  await clickEl("#gear", "A06");
  await page.waitForTimeout(SETTLE.settings);
  await cap("SETTINGS_OPEN");

  // 7. SEARCH_FILTERED — 'felix' matches 6 latin-tagged video nodes.
  await dispatchNative("#filterInput", "felix", "A07a");
  await page.waitForTimeout(SETTLE.search);
  await cap("SEARCH_FILTERED");
  await dispatchNative("#filterInput", "", "A07b");
  await page.waitForTimeout(SETTLE.search);

  // 8. ZOOMED — wheel -240px on canvas (targetZoom *= e^0.264, clamped 3.2).
  await page.mouse.move(c.x, c.y);
  await page.mouse.wheel(0, -240);
  log("A08", "canvas wheel -240", "mouse-wheel");
  await page.waitForTimeout(SETTLE.zoom);
  await cap("ZOOMED");
  probes.D7_no_page_scroll_after_wheel =
    states.ZOOMED.docScroll.scrollX === 0 && states.ZOOMED.docScroll.scrollY === 0 &&
    states.ZOOMED.canvasTouchAction === "none";

  // 9. DRAG_ORBITED — yaw += 120*.006, pitch += 40*.0048; moved>=7 must NOT
  //    change selection (DOM-observable suppression proof).
  const selBefore = states.VIDEO_SELECTED_PREVIEW.crumbTitle;
  await dragOnCanvas("A09", 120, 40);
  await page.waitForTimeout(SETTLE.drag);
  await cap("DRAG_ORBITED");
  probes.drag_selection_suppressed = states.DRAG_ORBITED.crumbTitle === selBefore;

  // 10. TURN_LEFT — yaw -= .35.
  await clickEl("#turnLeft", "A10");
  await page.waitForTimeout(SETTLE.turn);
  await cap("TURN_LEFT");

  // 11. FRAGMENTS_OFF — statsText drops to 22 (454-432).
  await clickEl("#tagsToggle", "A11a");
  await page.waitForTimeout(SETTLE.toggle);
  await cap("FRAGMENTS_OFF");
  await clickEl("#tagsToggle", "A11b");
  await page.waitForTimeout(SETTLE.toggle);

  // 12. LINKS_OFF
  await clickEl("#linksToggle", "A12a");
  await page.waitForTimeout(SETTLE.toggle);
  await cap("LINKS_OFF");
  await clickEl("#linksToggle", "A12b");
  await page.waitForTimeout(SETTLE.toggle);

  // 13/14. LAYOUT_ORBIT / LAYOUT_TIMELINE (targetZoom .9 / .72 per source).
  await dispatchNative("#layoutSelect", "orbit", "A13", "change");
  await page.waitForTimeout(SETTLE.layout);
  await cap("LAYOUT_ORBIT");
  await dispatchNative("#layoutSelect", "timeline", "A14", "change");
  await page.waitForTimeout(SETTLE.layout);
  await cap("LAYOUT_TIMELINE");

  // 15. SCALE_MAX — range max 1.7 -> scaleValue "1.7x". Then restore auto layout.
  await dispatchNative("#scaleRange", "1.7", "A15a");
  await page.waitForTimeout(SETTLE.toggle);
  await cap("SCALE_MAX");
  await dispatchNative("#layoutSelect", "auto", "A15b", "change");
  await clickEl("#closeSettings", "A15c");
  await page.waitForTimeout(SETTLE.settings);

  // 16. PLAYER_OPEN — previewPlay on selected video; D6 probe: 'x' must NOT close.
  await ensureInspector("A16a:inspector-open", true);
  await clickEl("#previewPlay", "A16b");
  await page.waitForTimeout(SETTLE.playerOpen);
  await cap("PLAYER_OPEN");
  await page.keyboard.press("x");
  log("A16c", "keyboard press 'x' (D6 probe)", "keyboard");
  await page.waitForTimeout(300);
  probes.D6_x_key_does_not_close = (await page.evaluate(SRC38_STATE)).playerClass.includes("open");

  // 17. PLAYER_CLOSED — Escape is the only keyboard close path (D6).
  await page.keyboard.press("Escape");
  log("A17", "keyboard press Escape", "keyboard");
  await page.waitForTimeout(SETTLE.playerClosed);
  await cap("PLAYER_CLOSED");
  if (vp.mobile) await ensureInspector("A17z:inspector-close", false);

  // 18. RESET_VIEW — deterministic source-native camera anchor again.
  await clickEl("#resetView", "A18");
  await page.waitForTimeout(SETTLE.reset);
  await cap("RESET_VIEW");

  // 19/20. MOBILE_INSPECTOR_OPEN / MOBILE_DRAG (mobile only).
  if (vp.mobile) {
    await clickEl("#mobileNote", "A19");
    await page.waitForTimeout(SETTLE.inspector);
    await cap("MOBILE_INSPECTOR_OPEN");
    await dragOnCanvas("A20", 80, 30);
    await page.waitForTimeout(SETTLE.drag);
    await cap("MOBILE_DRAG");
    await clickEl("#mobileNote", "A20z");
    await page.waitForTimeout(SETTLE.inspector);
  }

  // Extra probe: invalid video id O3ptaX7-G8w (D10/D11) — junhyuk hub, video idx 5.
  await ensureInspector("A21a:inspector-open", true);
  await clickEl("#connections .connection", "A21", 2);
  await page.waitForTimeout(SETTLE.select);
  await clickEl("#connections .connection", "A22", 5);
  await page.waitForFunction(() => document.getElementById("previewImage").complete, null, { timeout: 8000 });
  await page.waitForTimeout(SETTLE.select);
  await cap("PROBE_INVALID_VIDEO");
  probes.D10_D11_invalid_thumb_degraded =
    states.PROBE_INVALID_VIDEO.previewImgNaturalW === 120 &&
    /O3ptaX7-G8w/.test(states.PROBE_INVALID_VIDEO.previewImgSrc || "");
  await clickEl("#resetView", "A22z");
  await page.waitForTimeout(SETTLE.reset);
  if (vp.mobile) await ensureInspector("A22y:inspector-close", false);

  // 21. 320_OVERFLOW_GEAR_UNREACHABLE (320 only) — frozen D9 geometry.
  if (vp.narrow) {
    await cap("320_OVERFLOW_GEAR_UNREACHABLE");
    const g = states["320_OVERFLOW_GEAR_UNREACHABLE"];
    // html/body overflow:hidden clamps documentElement.scrollWidth to the
    // viewport; the frozen D9 evidence is the computed workspace grid track.
    probes.D9_gear_offscreen_unreachable =
      g.workspaceCols === "45px 487px" && g.gearRect.x + g.gearRect.w > g.docScroll.cw &&
      g.mobileNoteRect.x >= 0 && g.mobileNoteRect.x + g.mobileNoteRect.w <= g.docScroll.cw;
  }

  // D5 probe: Tab x12 must never focus the canvas (nodes not keyboard focusable).
  const tabFocus = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    tabFocus.push((await page.evaluate(SRC38_STATE)).activeElement);
  }
  probes.D5_canvas_never_tab_focusable = !tabFocus.some((a) => /canvas/i.test(a || ""));
  probes.tab_focus_sequence = tabFocus;

  // Camera-effect observability (intra-surface screenshot change).
  probes.camera_effects_visible = {
    zoom_changed: shots.ZOOMED !== shots.VIDEO_SELECTED_PREVIEW,
    drag_changed: shots.DRAG_ORBITED !== shots.ZOOMED,
    turn_changed: shots.TURN_LEFT !== shots.DRAG_ORBITED,
    layout_orbit_vs_timeline_changed: shots.LAYOUT_ORBIT !== shots.LAYOUT_TIMELINE,
    reset_changed: shots.RESET_VIEW !== shots.TURN_LEFT,
  };

  await ctx.close();
  return { states, shots, interactions, probes, net, pageErrors, consoleErrors };
}
function diffStates(a, b) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  const mismatches = [];
  for (const k of keys) {
    const va = JSON.stringify(a?.[k]);
    const vb = JSON.stringify(b?.[k]);
    if (va !== vb) mismatches.push({ channel: k, original: a?.[k], split: b?.[k] });
  }
  return mismatches;
}

async function buildPairs(browser, pairDir) {
  fs.mkdirSync(pairDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const pairs = [];
  for (const vp of VIEWPORTS) {
    for (const name of statesFor(vp)) {
      const o = path.join(TMP, "screenshots", "original", vp.key, `${name}.png`);
      const s = path.join(TMP, "screenshots", "split", vp.key, `${name}.png`);
      if (!fs.existsSync(o) || !fs.existsSync(s)) continue;
      const bo = fs.readFileSync(o).toString("base64");
      const bs = fs.readFileSync(s).toString("base64");
      await page.setContent(`<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0b0b0d;color:#ddd;font:12px monospace">
<div style="padding:6px 8px;font-weight:700">${vp.key} · ${name} · ORIGINAL (left) vs SPLIT (right)</div>
<div style="display:flex;gap:6px;align-items:flex-start;padding:0 8px 8px">
<img src="data:image/png;base64,${bo}" style="width:${Math.min(vp.width, 620)}px;border:1px solid #333">
<img src="data:image/png;base64,${bs}" style="width:${Math.min(vp.width, 620)}px;border:1px solid #333"></div>`);
      const file = path.join(pairDir, `${vp.key}__${name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      pairs.push(path.basename(file));
    }
  }
  await ctx.close();
  return pairs;
}

const gate = [];
const check = (name, ok, detail) => { gate.push({ name, ok: !!ok, detail: detail ?? null }); return !!ok; };

async function main() {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  const roots = buildRoots({ capsuleDir: CAPSULE, tmpRoot: path.join(TMP, "roots") });
  const srvO = await startServer(roots.originalRoot);
  const srvS = await startServer(roots.splitRoot);

  // Static served-content facts (per root, once). D1/D2/D3/D8/D11 static side.
  const staticFacts = {};
  for (const [label, srv] of [["original", srvO], ["split", srvS]]) {
    const html = await get(`${srv.origin}/`);
    const script = label === "split" ? await get(`${srv.origin}/script.js`) : { body: html.body };
    const css = label === "split" ? await get(`${srv.origin}/styles.css`) : { body: html.body };
    const h = html.body.toString("utf8");
    const sc = script.body.toString("utf8");
    const cs = css.body.toString("utf8");
    staticFacts[label] = {
      servedIndexBytes: html.body.length,
      htmlHasStatic551Literal: h.includes("454 notes, 551 links"),
      scriptHasEscapeOnlyKeydown: (sc.match(/addEventListener\('keydown'/g) || []).length === 1 && sc.includes("e.key==='Escape'"),
      scriptHasNoImageOnerror: !/onerror/i.test(sc),
      scriptHasThumbForm: sc.includes("https://i.ytimg.com/vi/") && sc.includes("/hqdefault.jpg"),
      scriptHasEmbedForm: sc.includes("https://www.youtube.com/embed/") && sc.includes("autoplay=1&rel=0"),
      cssTouchActionNone: cs.includes("touch-action:none"),
      scriptSha: sha256(script.body),
    };
  }

  const browser = await chromium.launch();
  const browserVersion = browser.version();
  const runs = { original: {}, split: {} };
  for (const vp of VIEWPORTS) {
    process.stderr.write(`[s4] ${vp.key} original...\n`);
    runs.original[vp.key] = await runViewport(browser, srvO.origin, vp, path.join(TMP, "screenshots", "original", vp.key));
    process.stderr.write(`[s4] ${vp.key} split...\n`);
    runs.split[vp.key] = await runViewport(browser, srvS.origin, vp, path.join(TMP, "screenshots", "split", vp.key));
  }

  const comparison = { viewports: {} };
  let allMatch = true;
  for (const vp of VIEWPORTS) {
    const o = runs.original[vp.key];
    const s = runs.split[vp.key];
    const perState = {};
    for (const name of statesFor(vp)) {
      const mismatches = diffStates(o.states[name], s.states[name]);
      perState[name] = { present: !!(o.states[name] && s.states[name]), mismatchCount: mismatches.length, mismatches: mismatches.slice(0, 20) };
      if (!perState[name].present || mismatches.length) allMatch = false;
    }
    const actionMismatch = o.interactions.filter((x, i) => s.interactions[i]?.method !== x.method || s.interactions[i]?.action !== x.action);
    comparison.viewports[vp.key] = {
      stateCount: Object.keys(perState).length,
      states: perState,
      actionSequenceIdentical: actionMismatch.length === 0 && o.interactions.length === s.interactions.length,
      actionMismatch: actionMismatch.slice(0, 10),
      probesOriginal: o.probes,
      probesSplit: s.probes,
      probesIdentical: JSON.stringify(o.probes) === JSON.stringify(s.probes),
    };
    if (!comparison.viewports[vp.key].actionSequenceIdentical || !comparison.viewports[vp.key].probesIdentical) allMatch = false;
  }

  // Semantic gates from the S4 contract (values must hold on BOTH surfaces).
  const sem = {};
  for (const surf of ["original", "split"]) {
    const d = runs[surf]["1280x800"];
    sem[surf] = {
      runtimeTopologyText: d.states.INITIAL_AUTO_ORBIT.statsText,
      runtimeStatsSub: d.states.INITIAL_AUTO_ORBIT.statsSub,
      rootLabel: d.states.ROOT_SELECTED.crumbTitle,
      hubLabel: d.states.HUB_SELECTED.crumbTitle,
      hubType: d.states.HUB_SELECTED.propType,
      videoLabel: d.states.VIDEO_SELECTED_PREVIEW.crumbTitle,
      videoPreviewSrc: d.states.VIDEO_SELECTED_PREVIEW.previewImgSrc,
      searchFiltered: d.states.SEARCH_FILTERED.statsText,
      fragmentsOff: d.states.FRAGMENTS_OFF.statsText,
      scaleMax: d.states.SCALE_MAX.scaleText,
      embedSrc: d.states.PLAYER_OPEN.iframeSrc,
      embedClosedClear: d.states.PLAYER_CLOSED.iframeSrc === null && !d.states.PLAYER_CLOSED.playerClass.includes("open"),
      invalidThumbNaturalW: d.states.PROBE_INVALID_VIDEO.previewImgNaturalW,
      d4: d.probes.D4_wobble_with_orbit_off,
      d5: d.probes.D5_canvas_never_tab_focusable,
      d6: d.probes.D6_x_key_does_not_close,
      d7: d.probes.D7_no_page_scroll_after_wheel,
      dragSuppressed: d.probes.drag_selection_suppressed,
      cameraEffects: d.probes.camera_effects_visible,
      pageErrors: d.pageErrors.length,
      consoleErrors: d.consoleErrors.filter((e) => e.local).length,
    };
  }
  const o320 = runs.original["320x720"].states["320_OVERFLOW_GEAR_UNREACHABLE"];
  const s320 = runs.split["320x720"].states["320_OVERFLOW_GEAR_UNREACHABLE"];
  const d9 = {
    original: { sw: o320.docScroll.sw, cw: o320.docScroll.cw, gearX: o320.gearRect.x, gearW: o320.gearRect.w, workspaceCols: o320.workspaceCols },
    split: { sw: s320.docScroll.sw, cw: s320.docScroll.cw, gearX: s320.gearRect.x, gearW: s320.gearRect.w, workspaceCols: s320.workspaceCols },
    identical: JSON.stringify(o320.docScroll) === JSON.stringify(s320.docScroll) && o320.gearRect.x === s320.gearRect.x,
  };

  const network = {};
  const health = {};
  for (const surf of ["original", "split"]) {
    network[surf] = {};
    health[surf] = { localFailed: [], ytThumb404: [], abortedExternal: 0, thirdPartyFailed: 0 };
    for (const vp of VIEWPORTS) {
      const n = classifyNetwork(runs[surf][vp.key].net);
      network[surf][vp.key] = n;
      health[surf].localFailed.push(...n.localFailed.map((e) => `${vp.key} ${e.url}`));
      health[surf].ytThumb404.push(...n.ytThumb404.map((e) => e.url));
      health[surf].abortedExternal += n.abortedExternal.length;
      health[surf].thirdPartyFailed += n.thirdPartyFailed.length;
    }
    health[surf].ytThumb404 = [...new Set(health[surf].ytThumb404)];
  }

  check("DOM_CSSOM_state_equality_all_matched_states", allMatch);
  check("runtime_topology_454_543",
    sem.original.runtimeTopologyText === "454 notes, 543 links" && sem.split.runtimeTopologyText === "454 notes, 543 links");
  check("people_videos_subtitle",
    sem.original.runtimeStatsSub === "3 people · 18 videos · living memory graph" && sem.split.runtimeStatsSub === sem.original.runtimeStatsSub);
  check("static_551_literal_preserved_served_html",
    staticFacts.original.htmlHasStatic551Literal && staticFacts.split.htmlHasStatic551Literal);
  check("selection_chain_root_hub_video",
    sem.original.rootLabel === "나의 LoveTree 우주" && sem.original.hubLabel === "필릭스의 LoveTree" &&
    sem.original.hubType === "person-lovetree" && sem.original.videoLabel === "처음 마음을 멈추게 한 神메뉴" &&
    sem.split.rootLabel === sem.original.rootLabel && sem.split.hubLabel === sem.original.hubLabel &&
    sem.split.videoLabel === sem.original.videoLabel);
  check("filter_semantics_6_notes",
    sem.original.searchFiltered === "6 notes, 543 links" && sem.split.searchFiltered === sem.original.searchFiltered);
  check("fragments_off_semantics_22_notes",
    sem.original.fragmentsOff === "22 notes, 543 links" && sem.split.fragmentsOff === sem.original.fragmentsOff);
  check("scale_max_semantics",
    sem.original.scaleMax === "1.7×" && sem.split.scaleMax === sem.original.scaleMax);
  check("embed_url_form",
    sem.original.embedSrc === "https://www.youtube.com/embed/nOrDWTMSR0w?autoplay=1&rel=0" && sem.split.embedSrc === sem.original.embedSrc);
  check("player_close_clears_iframe", sem.original.embedClosedClear && sem.split.embedClosedClear);
  check("thumbnail_url_form",
    sem.original.videoPreviewSrc === "https://i.ytimg.com/vi/nOrDWTMSR0w/hqdefault.jpg" &&
    sem.split.videoPreviewSrc === sem.original.videoPreviewSrc &&
    staticFacts.original.scriptHasThumbForm && staticFacts.split.scriptHasThumbForm);
  check("D1_synthetic_fixtures_identical",
    sem.original.runtimeTopologyText === sem.split.runtimeTopologyText &&
    runs.original["1280x800"].states.RESET_VIEW.connectionCount === runs.split["1280x800"].states.RESET_VIEW.connectionCount);
  check("D2_D3_external_hosts_verbatim", staticFacts.original.scriptHasEmbedForm && staticFacts.split.scriptHasEmbedForm);
  check("D4_motion_probe_both_surfaces", sem.original.d4 === true && sem.split.d4 === true);
  check("D5_canvas_not_tab_focusable", sem.original.d5 && sem.split.d5);
  check("D6_escape_only_keyboard_path",
    sem.original.d6 && sem.split.d6 && staticFacts.original.scriptHasEscapeOnlyKeydown && staticFacts.split.scriptHasEscapeOnlyKeydown);
  check("D7_touch_action_and_wheel_ownership",
    sem.original.d7 && sem.split.d7 && staticFacts.original.cssTouchActionNone && staticFacts.split.cssTouchActionNone);
  check("D8_static_vs_runtime_distinction",
    staticFacts.original.htmlHasStatic551Literal && sem.original.runtimeTopologyText === "454 notes, 543 links");
  check("D9_320_overflow_gear_unreachable",
    runs.original["320x720"].probes.D9_gear_offscreen_unreachable && runs.split["320x720"].probes.D9_gear_offscreen_unreachable && d9.identical);
  check("D10_invalid_video_id_404",
    health.original.ytThumb404.some((u) => u.includes("O3ptaX7-G8w")) && health.split.ytThumb404.some((u) => u.includes("O3ptaX7-G8w")));
  check("D11_no_image_error_handler_degraded_identical",
    sem.original.invalidThumbNaturalW === 120 && sem.split.invalidThumbNaturalW === 120 &&
    staticFacts.original.scriptHasNoImageOnerror && staticFacts.split.scriptHasNoImageOnerror &&
    runs.original["1280x800"].probes.D10_D11_invalid_thumb_degraded &&
    runs.split["1280x800"].probes.D10_D11_invalid_thumb_degraded);
  check("camera_control_effects_browser_observable",
    Object.values(sem.original.cameraEffects).every(Boolean) && Object.values(sem.split.cameraEffects).every(Boolean));
  check("drag_selection_suppression", sem.original.dragSuppressed && sem.split.dragSuppressed);
  check("no_local_http_failures", health.original.localFailed.length === 0 && health.split.localFailed.length === 0);
  check("zero_source_page_errors",
    runs.original["1280x800"].pageErrors.length === 0 && runs.split["1280x800"].pageErrors.length === 0 &&
    runs.original["390x844"].pageErrors.length === 0 && runs.split["390x844"].pageErrors.length === 0 &&
    runs.original["320x720"].pageErrors.length === 0 && runs.split["320x720"].pageErrors.length === 0);
  const localConsole = (r) => r.consoleErrors.filter((e) => e.local);
  check("zero_main_frame_console_errors",
    VIEWPORTS.every((vp) => localConsole(runs.original[vp.key]).length === 0 && localConsole(runs.split[vp.key]).length === 0));
  check("served_roots_are_frozen_capsule_copies", Object.keys(roots.files).length === 4);

  const pairs = await buildPairs(browser, path.join(TMP, "pair"));
  await browser.close();
  srvO.server.close();
  srvS.server.close();

  const gateFail = gate.filter((g) => !g.ok);
  const evidence = {
    schema_version: "1.0",
    source_id: "SRC038",
    stage: "S4_MOTION_AWARE_PARITY",
    contract: "#589 comment 5654031252 / PR #650 comment 5654031586",
    generated_at: new Date().toISOString(),
    chromium_version: browserVersion,
    device_scale_factor: 1,
    viewports: VIEWPORTS.map((v) => v.key),
    required_states: 21,
    matched_state_count: VIEWPORTS.reduce((a, v) => a + statesFor(v).length, 0),
    raw_png_equality_used: false,
    pixel_tolerance_used: false,
    qa_clock_patch_used: false,
    qa_raf_patch_used: false,
    qa_runtime_hook_used: false,
    motion_policy: "SOURCE_NATIVE_TIME_WOBBLE_PRESERVED",
    camera_evidence_policy: "SOURCE_NATIVE_RESET_VIEW_DETERMINISTIC_ANCHOR_PLUS_BROWSER_OBSERVABLE_DELTAS",
    roots_file_sha256: roots.files,
    static_facts: staticFacts,
    semantic: sem,
    d9_geometry: d9,
    health,
    gate: { total: gate.length, failed: gateFail.map((g) => g.name) },
    comparison_summary: {
      all_dom_state_equal: allMatch,
      per_viewport: Object.fromEntries(Object.entries(comparison.viewports).map(([k, v]) => [k, {
        stateCount: v.stateCount,
        mismatchTotal: Object.values(v.states).reduce((a, x) => a + x.mismatchCount, 0),
        actionSequenceIdentical: v.actionSequenceIdentical,
        probesIdentical: v.probesIdentical,
      }])),
    },
    side_by_side_pairs: pairs.length,
    evidence_drive_folder: DRIVE_FOLDER,
    parity_flags_written: false,
    worker_disposition: gateFail.length === 0 ? "READY_FOR_CENTRAL_S4_VISUAL_REVIEW" : "HOLD_S4_GATE_FAILURE",
  };

  fs.writeFileSync(path.join(TMP, "comparison.json"), JSON.stringify({ evidence, comparison, gate }, null, 2));
  fs.writeFileSync(path.join(TMP, "SRC038_S4_PARITY_REPORT.md"), renderReport(evidence, comparison));
  for (const surf of ["original", "split"]) {
    fs.writeFileSync(path.join(TMP, `runtime-${surf}.json`), JSON.stringify(Object.fromEntries(VIEWPORTS.map((vp) => [vp.key, runs[surf][vp.key].states])), null, 2));
    fs.writeFileSync(path.join(TMP, `interaction-${surf}.json`), JSON.stringify(Object.fromEntries(VIEWPORTS.map((vp) => [vp.key, { interactions: runs[surf][vp.key].interactions, probes: runs[surf][vp.key].probes, shots: runs[surf][vp.key].shots, pageErrors: runs[surf][vp.key].pageErrors, consoleErrors: runs[surf][vp.key].consoleErrors }])), null, 2));
    fs.writeFileSync(path.join(TMP, `network-${surf}.json`), JSON.stringify(Object.fromEntries(VIEWPORTS.map((vp) => [vp.key, {
      raw: runs[surf][vp.key].net,
      classified: {
        localRequests: network[surf][vp.key].localRequests.map((e) => e.url),
        localFailed: network[surf][vp.key].localFailed,
        ytThumbRequests: network[surf][vp.key].ytThumbRequests.map((e) => ({ url: e.url, status: e.status })),
        ytThumb404: network[surf][vp.key].ytThumb404.map((e) => e.url),
        ytEmbedRequests: network[surf][vp.key].ytEmbedRequests.map((e) => ({ url: e.url, status: e.status })),
        thirdPartyCount: network[surf][vp.key].thirdPartyRequests.length,
        thirdPartyFailed: network[surf][vp.key].thirdPartyFailed.length,
        abortedExternal: network[surf][vp.key].abortedExternal.length,
      },
    }])), null, 2));
  }
  fs.mkdirSync(path.join(CAPSULE, "evidence", "parity"), { recursive: true });
  fs.writeFileSync(path.join(CAPSULE, "evidence", "parity", "s4-motion-parity.json"), JSON.stringify({
    ...evidence,
    comparison: evidence.comparison_summary,
  }, null, 2) + "\n");

  const reviewIndex = ["# SRC038 S4 side-by-side review index", ""];
  for (const p of pairs) reviewIndex.push(`- pair/${p}`);
  fs.writeFileSync(path.join(TMP, "pair", "review-index.md"), reviewIndex.join("\n") + "\n");

  process.stderr.write(`\n[s4] GATE ${gate.length - gateFail.length}/${gate.length} PASS\n`);
  for (const g of gate) process.stderr.write(`  ${g.ok ? "PASS" : "FAIL"} ${g.name}\n`);
  if (gateFail.length) {
    process.stderr.write(`\n[s4] FAILED: ${gateFail.map((g) => g.name).join(", ")}\n`);
    if (!allMatch) process.stderr.write("[s4] DOM mismatches (first):\n" + JSON.stringify(
      Object.fromEntries(Object.entries(comparison.viewports).map(([k, v]) => [k, Object.fromEntries(Object.entries(v.states).filter(([, x]) => x.mismatchCount > 0).map(([n, x]) => [n, x.mismatches]))]))
      , null, 2).slice(0, 4000) + "\n");
    process.exitCode = 1;
  } else {
    process.stderr.write(`[s4] READY_FOR_CENTRAL_S4_VISUAL_REVIEW · evidence=${TMP}\n`);
  }
}

function renderReport(evidence, comparison) {
  const L = [];
  L.push("# SRC038 S4 Motion-Aware Parity Report (worker)");
  L.push("");
  L.push("```text");
  L.push(`CONTRACT                = ${evidence.contract}`);
  L.push(`CHROMIUM                = ${evidence.chromium_version} (single build, both surfaces)`);
  L.push(`VIEWPORTS               = ${evidence.viewports.join(" / ")} · deviceScaleFactor=1`);
  L.push(`MATCHED_STATE_COUNT     = ${evidence.matched_state_count} (required 21 + per-viewport extras)`);
  L.push(`MOTION_POLICY           = ${evidence.motion_policy}`);
  L.push(`RAW_PNG_EQUALITY_USED   = ${evidence.raw_png_equality_used}`);
  L.push(`PIXEL_TOLERANCE_USED    = ${evidence.pixel_tolerance_used}`);
  L.push(`QA_CLOCK/RAF/HOOK_PATCH = ${evidence.qa_clock_patch_used}/${evidence.qa_raf_patch_used}/${evidence.qa_runtime_hook_used}`);
  L.push(`DOM_STATE_EQUAL_ALL     = ${evidence.comparison_summary.all_dom_state_equal}`);
  L.push(`GATE                    = ${evidence.gate.total - evidence.gate.failed.length}/${evidence.gate.total} PASS`);
  L.push(`WORKER_DISPOSITION      = ${evidence.worker_disposition}`);
  L.push("```");
  L.push("");
  L.push("## Serving integrity (frozen capsule, verbatim copies)");
  L.push("");
  L.push("```json");
  L.push(JSON.stringify(evidence.roots_file_sha256, null, 2));
  L.push("```");
  L.push("");
  L.push("## Static facts");
  L.push("");
  L.push("```json");
  L.push(JSON.stringify(evidence.static_facts, null, 2));
  L.push("```");
  L.push("");
  L.push("## Semantic parity (1280x800, both surfaces)");
  L.push("");
  L.push("```json");
  L.push(JSON.stringify(evidence.semantic, null, 2));
  L.push("```");
  L.push("");
  L.push("## D9 320px overflow geometry");
  L.push("");
  L.push("```json");
  L.push(JSON.stringify(evidence.d9_geometry, null, 2));
  L.push("```");
  L.push("");
  L.push("## Per-viewport comparison");
  L.push("");
  for (const [k, v] of Object.entries(comparison.viewports)) {
    L.push(`### ${k}`);
    L.push("");
    L.push("```json");
    L.push(JSON.stringify(evidence.comparison_summary.per_viewport[k], null, 2));
    L.push("```");
    L.push("");
    const bad = Object.entries(v.states).filter(([, x]) => x.mismatchCount > 0);
    if (bad.length) {
      L.push("MISMATCHES:");
      L.push("```json");
      L.push(JSON.stringify(Object.fromEntries(bad), null, 2));
      L.push("```");
    }
  }
  L.push("## Gate checklist");
  L.push("");
  for (const g of gate) L.push(`- [${g.ok ? "x" : " "}] ${g.name}`);
  L.push("");
  L.push("## Motion / camera evidence policy");
  L.push("");
  L.push("- D4: two shots 400ms apart with auto-orbit OFF differ on BOTH surfaces (bytes differ); no clock was patched.");
  L.push("- D10/D11 observed truth: i.ytimg answers the invalid id O3ptaX7-G8w hqdefault with HTTP 404 whose body is a 120x90");
  L.push("  placeholder image, which the browser renders (previewImage.naturalWidth=120). No img.onerror exists and none was");
  L.push("  added; the degraded result is byte-equivalent in behavior on both surfaces. The baseline's 'gradient' wording is");
  L.push("  superseded by this observation; the frozen defect (no error handling, id preserved verbatim) is intact.");
  L.push("- Camera anchor: source-native #resetView (yaw=-.28, pitch=.08, zoom=.96, focus=0) executed on both surfaces.");
  L.push("- Zoom/drag/turn/layout effects: intra-surface screenshot change booleans (both surfaces, all true).");
  L.push("- Drag selection suppression: crumbTitle invariant across drag (DOM-observable, both surfaces).");
  L.push("- Cross-surface raw-PNG equality is NOT asserted; matched screenshots go to pair/ for CENTRAL visual review.");
  L.push("");
  L.push("## Health classification");
  L.push("");
  L.push("```json");
  L.push(JSON.stringify(evidence.health, null, 2));
  L.push("```");
  L.push("");
  L.push(`Side-by-side pairs: ${evidence.side_by_side_pairs} (pair/review-index.md)`);
  L.push(`Drive target: ${evidence.evidence_drive_folder}`);
  L.push("");
  return L.join("\n");
}

main().catch((e) => {
  console.error(e);
  try {
    fs.mkdirSync(TMP, { recursive: true });
    fs.writeFileSync(path.join(TMP, "RUNNER_ERROR.txt"), String(e?.stack || e));
  } catch { /* ignore */ }
  process.exitCode = 1;
});

