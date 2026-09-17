import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VIEWPORTS, sha256, sha256str, resolvePlaywright, startStaticServer, prepareServeRoots,
  captureStableStates, captureLensState, captureMyTreeSacrificial, captureLiveness,
} from "./lib/s4-runner.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAPSULE = path.resolve(__dirname, "..");
const MATERIAL = process.env.SRC071_S4_MATERIAL || path.join(process.env.TEMP || "D:\\Temp", "src071-s4-material");
const OUT = process.env.SRC071_S4_OUT || path.join(process.env.TEMP || "D:\\Temp", "src071-s4-candidate");
const S2_BASELINE = process.env.SRC071_S2_BASELINE || "D:\\Temp\\src071-s2-candidate-7f81281c";
const ORIG_PORT = Number(process.env.S4_PORT_ORIG || 3124);
const SPLIT_PORT = Number(process.env.S4_PORT_SPLIT || 3125);

fs.mkdirSync(path.join(OUT, "screenshots"), { recursive: true });
fs.mkdirSync(path.join(OUT, "diffs"), { recursive: true });

const { origRoot, splitRoot } = prepareServeRoots(MATERIAL, path.join(CAPSULE, "original", "original.html"), [
  path.join(CAPSULE, "split", "index.html"),
  path.join(CAPSULE, "split", "styles.css"),
  path.join(CAPSULE, "split", "script.js"),
]);

const stripNums = (s) => s.replace(/\d+\.\d{5,}/g, "N");
const stripGlue = (s) => s.replace(/<script[\s\S]*?<\/script>/g, "<script/>");
const runtimeComparable = (s) => { const { bodyHTML, bodyText, ...rest } = s; return rest; };
const normUrl = (u) => u ? u.replace(/127\.0\.0\.1:\d+/, "127.0.0.1:PORT") : u;

const results = [];
const pw = await resolvePlaywright();
const serverO = await startStaticServer(origRoot, ORIG_PORT);
const serverS = await startStaticServer(splitRoot, SPLIT_PORT);
const browser = await pw.chromium.launch({ headless: true });

const sideCfg = {
  original: { baseUrl: `http://127.0.0.1:${ORIG_PORT}`, entryFile: "71_V7_FINAL_INTERACTIVE_R2.4.html" },
  split: { baseUrl: `http://127.0.0.1:${SPLIT_PORT}`, entryFile: "index.html" },
};

try {
  for (const side of ["original", "split"]) {
    const cfg = sideCfg[side];
    await captureStableStates({ browser, ...cfg, side, outDir: OUT, results });
    await captureLensState({ browser, ...cfg, side, outDir: OUT, results });
    await captureMyTreeSacrificial({ browser, ...cfg, side, outDir: OUT, results });
    await captureLiveness({ browser, ...cfg, side, results });
  }
} finally {
  await browser.close();
  serverO.kill();
  serverS.kill();
}

const byKey = (side) => Object.fromEntries(results.filter((r) => r.side === side).map((r) => [`${r.viewport}|${r.state}`, r]));
const O = byKey("original");
const S = byKey("split");
const failures = [];
const comparison = [];

const shotKeys = [];
for (const vp of VIEWPORTS) {
  shotKeys.push(`${vp.name}|01_INITIAL`, `${vp.name}|02_THEME_BLACK`, `${vp.name}|03_REEL_OFFSET_470`);
}
shotKeys.push("desktop1440x900|04_LENS_ACTIVATE_OPENING", "desktop1440x900|05_MYTREE_404");

function compareRec(key) {
  const a = O[key], b = S[key];
  if (!a || !b) { failures.push(`${key}: missing record`); return; }
  const entry = { key, state: a.state, viewport: a.viewport, channels: {} };
  if (a.state === "05_MYTREE_404") {
    entry.channels.httpStatus = [a.httpStatus, b.httpStatus, a.httpStatus === 404 && b.httpStatus === 404 ? "EQUAL" : "DIFF"];
    entry.channels.navigationUrl = [normUrl(a.navigationUrl), normUrl(b.navigationUrl), normUrl(a.navigationUrl) === normUrl(b.navigationUrl) ? "EQUAL" : "DIFF"];
    entry.channels.title = [a.title, b.title, a.title === b.title ? "EQUAL" : "DIFF"];
    entry.channels.bodyText = [sha256str(a.bodyText), sha256str(b.bodyText), a.bodyText === b.bodyText ? "EQUAL" : "DIFF"];
    entry.channels.png = [a.pngSha, b.pngSha, a.pngSha === b.pngSha ? "BYTE_IDENTICAL" : "DIFF"];
    if (a.pngSha !== b.pngSha) failures.push(`${key}: 404 page PNG differs`);
    if (normUrl(a.navigationUrl) !== normUrl(b.navigationUrl) || a.httpStatus !== 404 || b.httpStatus !== 404) failures.push(`${key}: 404 mapping parity failed`);
    comparison.push(entry);
    return;
  }
  const sa = a.snapshot, sb = b.snapshot;
  const pngA = sha256(fs.readFileSync(path.join(OUT, "screenshots", a.file)));
  const pngB = sha256(fs.readFileSync(path.join(OUT, "screenshots", b.file)));
  const eq = (name, va, vb) => {
    const equal = JSON.stringify(va) === JSON.stringify(vb);
    entry.channels[name] = equal ? "EQUAL" : { original: va, split: vb };
    if (!equal) failures.push(`${key}: channel ${name} differs`);
  };
  eq("bodyHTML", sha256str(stripNums(stripGlue(sa.bodyHTML))), sha256str(stripNums(stripGlue(sb.bodyHTML))));
  eq("bodyText", sa.bodyText, sb.bodyText);
  eq("canvasDims", [sa.canvasW, sa.canvasH], [sb.canvasW, sb.canvasH]);
  eq("canvasDataURL", sa.canvasDataURLSha, sb.canvasDataURLSha);
  eq("runtimeState", runtimeComparable(sa), runtimeComparable(sb));
  eq("geometry", [sa.paperBox, sa.stageTransform, sa.hitRects], [sb.paperBox, sb.stageTransform, sb.hitRects]);
  eq("visibility", [sa.metaDisplay, sa.toggleVisible], [sb.metaDisplay, sb.toggleVisible]);
  eq("scroll", a.guard.windowScroll, b.guard.windowScroll);
  entry.channels.scrollDrift = [a.guard.zero && b.guard.zero ? "0,0 BOTH" : "DRIFT DETECTED"];
  if (!(a.guard.zero && b.guard.zero)) failures.push(`${key}: scroll drift`);
  eq("consoleErrors", a.logs.consoleErrors, b.logs.consoleErrors);
  eq("pageErrors", a.logs.pageErrors, b.logs.pageErrors);
  entry.channels.pngBytes = [fs.statSync(path.join(OUT, "screenshots", a.file)).size, fs.statSync(path.join(OUT, "screenshots", b.file)).size];
  entry.channels.pngSha = [pngA, pngB, pngA === pngB ? "BYTE_IDENTICAL" : "DIFF"];
  if (pngA !== pngB) {
    failures.push(`${key}: PNG differs`);
    fs.copyFileSync(path.join(OUT, "screenshots", a.file), path.join(OUT, "diffs", `O_${a.file}`));
    fs.copyFileSync(path.join(OUT, "screenshots", b.file), path.join(OUT, "diffs", `S_${b.file}`));
  }
  if (a.logs.consoleErrors.length || a.logs.pageErrors.length) failures.push(`${key}: runtime errors on original`);
  if (b.logs.consoleErrors.length || b.logs.pageErrors.length) failures.push(`${key}: runtime errors on split`);
  if (a.state === "04_LENS_ACTIVATE_OPENING") {
    eq("lensMoment", a.moment, b.moment);
    entry.channels.lensMoment = entry.channels.lensMoment || a.moment;
  }
  comparison.push(entry);
}

for (const k of shotKeys) compareRec(k);

function compareProof(key) {
  const a = O[key], b = S[key];
  if (!a || !b) { failures.push(`${key}: missing proof`); return; }
  const entry = { key, state: a.state, viewport: a.viewport, channels: {} };
  if (a.state === "DRAG_PROOF") {
    entry.channels.viewYDuringDrag = [a.viewYDuringDrag, b.viewYDuringDrag, a.viewYDuringDrag === b.viewYDuringDrag && a.viewYDuringDrag === 205.2 ? "EQUAL_EXACT" : "DIFF"];
    if (a.viewYDuringDrag !== b.viewYDuringDrag) failures.push(`${key}: drag viewY differs`);
  } else if (a.state === "WHEEL_PROOF") {
    entry.channels.delta = [a.delta, b.delta, a.delta === b.delta && a.moved && b.moved ? "EQUAL_EXACT" : "DIFF"];
    if (a.delta !== b.delta) failures.push(`${key}: wheel settle delta differs`);
  } else if (a.state === "KEY_HOLD_PROOF") {
    entry.channels.nonZero = [a.nonZero, b.nonZero, a.nonZero && b.nonZero ? "EQUAL" : "DIFF"];
    if (!(a.nonZero && b.nonZero)) failures.push(`${key}: hold-key velocity not nonzero on both`);
  } else if (a.state === "HOVER_PROOF") {
    entry.channels.hover = [a.hover, b.hover, a.hover === b.hover && a.hover === true ? "EQUAL" : "DIFF"];
    entry.channels.cursor = [a.cursor, b.cursor, a.cursor === b.cursor && a.cursor === "pointer" ? "EQUAL" : "DIFF"];
    if (a.hover !== b.hover || b.hover !== true) failures.push(`${key}: hover parity failed`);
  } else if (a.state === "THEME_RESTORE_WHITE") {
    entry.channels.theme = [a.theme, b.theme, a.theme === "white" && b.theme === "white" ? "EQUAL" : "DIFF"];
    entry.channels.scrollDrift = [a.guard.zero && b.guard.zero ? "0,0 BOTH" : "DRIFT"];
    if (!(a.guard.zero && b.guard.zero)) failures.push(`${key}: scroll drift`);
  } else if (a.state === "MOBILE_CLIP_QA") {
    const { side, ...rest } = a;
    const { side: s2, ...rest2 } = b;
    entry.channels.qa = [rest, rest2, JSON.stringify(rest) === JSON.stringify(rest2) ? "EQUAL" : "DIFF"];
    if (JSON.stringify(rest) !== JSON.stringify(rest2)) failures.push(`${key}: mobile clip observations differ`);
  } else if (a.state === "ANIMATION_LIVENESS") {
    entry.channels.liveness = [a.canvasPixelsChanged && a.caretAnimating && b.canvasPixelsChanged && b.caretAnimating ? "PASS_BOTH" : "DIFF"];
    if (!(a.canvasPixelsChanged && a.caretAnimating && b.canvasPixelsChanged && b.caretAnimating)) failures.push(`${key}: liveness failed`);
  } else if (a.state === "LOGS_STABLE") {
    entry.channels.errors = [a.logs.consoleErrors.length + a.logs.pageErrors.length, b.logs.consoleErrors.length + b.logs.pageErrors.length, "0/0"];
    if (a.logs.consoleErrors.length || a.logs.pageErrors.length || b.logs.consoleErrors.length || b.logs.pageErrors.length) failures.push(`${key}: unexpected errors`);
  }
  comparison.push(entry);
}

for (const side of ["original", "split"]) {
  for (const vp of VIEWPORTS) {
    for (const st of ["THEME_RESTORE_WHITE", "DRAG_PROOF", "WHEEL_PROOF", "KEY_HOLD_PROOF", "HOVER_PROOF", "LOGS_STABLE"]) {
      compareProof(`${vp.name}|${st}`);
    }
    if (!vp.desktop) compareProof(`${vp.name}|MOBILE_CLIP_QA`);
  }
}
compareProof("desktop1440x900|ANIMATION_LIVENESS");

const pngManifest = fs.readdirSync(path.join(OUT, "screenshots")).filter((f) => f.endsWith(".png")).map((f) => {
  const buf = fs.readFileSync(path.join(OUT, "screenshots", f));
  return { file: f, bytes: buf.length, sha256: sha256(buf) };
});

let s2Reference = [];
try {
  const s2j = JSON.parse(fs.readFileSync(path.join(S2_BASELINE, "s2-evidence.json"), "utf8"));
  s2Reference = (s2j.pngManifest || []).map((m) => ({ baselineFile: m.file, baselineSha: m.sha256, baselineBytes: m.bytes }));
} catch {
  s2Reference = [{ note: "S2 baseline manifest not readable at SRC071_S2_BASELINE path" }];
}

const allPngEqual = shotKeys.every((k) => {
  const a = O[k], b = S[k];
  if (!a || !b) return false;
  return sha256(fs.readFileSync(path.join(OUT, "screenshots", a.file))) === sha256(fs.readFileSync(path.join(OUT, "screenshots", b.file)));
});

const meta = {
  generatedAt: new Date().toISOString(),
  stage: "S4_EXACT_PARITY_CANDIDATE",
  acceptanceClaimed: false,
  authority: {
    file: "71_V7_FINAL_INTERACTIVE_R2.4.html",
    driveFileId: "1YWLz4gsIoqBi7TXINd5-IjR_mFg5VBtL",
    bytes: 24039,
    sha256: "2a646b96e032f21ebc394dfa06ef4679cfdaee2c0ff7b0181f37d5143397452a",
  },
  serving: {
    virtualDepth: "both entry files served at root depth of their own isolated tree; relative route resolution identical",
    original: { root: origRoot, url: `http://127.0.0.1:${ORIG_PORT}/71_V7_FINAL_INTERACTIVE_R2.4.html` },
    split: { root: splitRoot, url: `http://127.0.0.1:${SPLIT_PORT}/index.html` },
    server: "python http.server (loopback, authority-only dirs, no URL rewriting)",
  },
  viewports: VIEWPORTS.map((v) => `${v.width}x${v.height}`),
  deviceScaleFactor: 1,
  reducedMotion: "reduce for all stable states; separate no-preference context for animation liveness",
  matchedScreenshotStates: shotKeys.length,
  pngManifest,
  s2BaselineReference: s2Reference,
  screenshotParity: allPngEqual ? "BYTE_IDENTICAL" : "DIFF",
  failures,
  disposition: failures.length === 0 ? "READY_FOR_CENTRAL_S4_VISUAL_REVIEW" : "HOLD_VISUAL_PARITY_DIFF",
};

fs.writeFileSync(path.join(OUT, "comparison.json"), JSON.stringify({ comparison }, null, 1));
fs.writeFileSync(path.join(OUT, "runtime.json"), JSON.stringify({ results }, null, 1));
fs.writeFileSync(path.join(OUT, "parity-meta.json"), JSON.stringify(meta, null, 1));

console.log(`SRC071_S4 states=${shotKeys.length} pngParity=${allPngEqual ? "BYTE_IDENTICAL" : "DIFF"} failures=${failures.length}`);
for (const f of failures.slice(0, 40)) console.log("FAIL:", f);
console.log(`OUT=${OUT}`);
if (failures.length) { console.log("RESULT=HOLD_VISUAL_PARITY_DIFF"); process.exitCode = 1; }
else console.log("RESULT=READY_FOR_CENTRAL_S4_VISUAL_REVIEW");
