/**
 * SRC068 S3 Mechanical Split — Round-Trip Validation (local only).
 *
 * Independently re-derives every boundary from the frozen authority
 * originals (byte search, own logic) and proves:
 *  - T01/T02 authority A/B SHA-256 locks hold (frozen inputs preserved)
 *  - T03 semantic A/B diff is exactly {title, imageUrls statement}
 *  - T04 split/styles.css === authority style inner bytes
 *  - T05 split/script.js === BOOTSTRAP + MARKER + authority script tail
 *  - T06/T07 variant JSONs hold exactly 9 image URLs each
 *  - T08/T09 no cross-variant asset leakage
 *  - T10 missing selector fails closed (throws)
 *  - T11 invalid selectors fail closed (throw); A/B resolve with title+images
 *  - T12/T13 reconstructed A'/B' are byte-identical to frozen authorities
 *  - T14 frozen inputs untouched (original/ + authority/ file sets + hashes)
 *  - T15 no React/TS/TSX/JSX/Next/ESM in split runtime files
 *  - T16 no backend/DB/auth markers in split runtime files
 *  - T17 no product adapter in split (no MVP routes/data wiring)
 *  - T18 hero MP4 absolute CloudFront URLs unchanged in split
 *  - T19 variant titles correct (V3.3A vs V3.3B)
 *  - T20 variant imageUrls data correct (9 exact paths each)
 *  - T21 manifest flags: S3 complete, S4 parity accepted and referenced
 *
 * Writes S3 run evidence to an OS temp directory only; the committed
 * parity/s3-roundtrip.json record is never overwritten by a test run.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { execFileSync } from "node:child_process";

const ROOT = path.join(import.meta.dirname, "..");
const ORIG = path.join(ROOT, "original");
const SPLIT = path.join(ROOT, "split");
const ASSETS = path.join(SPLIT, "assets");

const LOCK_A = "9daa5f7690c6a95d5c5e75fc16b5d950533921d9f41ec008053fa4c79d566c42";
const LOCK_B = "cb5553d399a728cd28422f8112f6cc59c185de68b522aa431e9d3bb1f4275004";

const TITLE_A = "<title>LoveTree Track68 V3.3A \u00b7 Codex Portals</title>";
const TITLE_B = "<title>LoveTree Track68 V3.3B \u00b7 Codex Portals</title>";
const TITLE_SENTINEL = "<!--SRC068_VARIANT_TITLE-->";
const LINK_LINE = '<link rel="stylesheet" href="./styles.css"/>';
const SCRIPT_SRC_LINE = '<script src="./script.js"></script>';
const JS_MARKER = "/*__SRC068_COMMON_JS_FOLLOWS__*/\n";

const EXPECTED_A_URLS = Array.from({ length: 9 }, (_, i) => `../images/0${i + 1}.png`);
const EXPECTED_B_URLS = Array.from({ length: 9 }, (_, i) => `../images/\ub3d9\uc591\uc7780${i + 1}.png`);

let passed = 0;
let failed = 0;
const checks = [];
function ok(cond, id, detail) {
  checks.push({ id, pass: !!cond, detail: detail || "" });
  if (cond) { passed++; console.log(`  \u2713 ${id}${detail ? " — " + detail : ""}`); }
  else { failed++; console.log(`  \u2717 FAIL: ${id}${detail ? " — " + detail : ""}`); }
}
function sha256(buf) { return crypto.createHash("sha256").update(buf).digest("hex"); }
function readBin(p) { return fs.readFileSync(p); }
function readTxt(p) { return fs.readFileSync(p, "utf8"); }
function commitExists(sha) {
  try { execFileSync("git", ["-C", ROOT, "cat-file", "-e", `${sha}^{commit}`], { stdio: "ignore" }); return true; }
  catch { return false; }
}

function findOriginal(tag) {
  const canonical = path.join(ORIG, tag, "original.html");
  if (fs.existsSync(canonical)) return canonical;
  const hits = fs.readdirSync(ORIG).filter((f) => f.includes(`V3.3.1${tag}_`) && f.endsWith(".html"));
  if (hits.length !== 1) throw new Error(`expected exactly one V3.3.1${tag} original, found ${hits.length}`);
  return path.join(ORIG, hits[0]);
}

console.log("\n=== SRC068 S3 Mechanical Split — Round-Trip Validation ===\n");

// ---- frozen inputs ---------------------------------------------------------
console.log("Frozen authority inputs:");
const aBuf = readBin(findOriginal("A"));
const bBuf = readBin(findOriginal("B"));
ok(sha256(aBuf) === LOCK_A, "T01", "authority A SHA-256 locked");
ok(sha256(bBuf) === LOCK_B, "T02", "authority B SHA-256 locked");
ok(aBuf.length === 18565 && bBuf.length === 18646, "T14a", `authority byte sizes stable (${aBuf.length}/${bBuf.length})`);
const ORIG_LAYOUT_OK =
  fs.readdirSync(ORIG).filter((f) => f.endsWith(".html")).length === 2 ||
  (fs.existsSync(path.join(ORIG, "A", "original.html")) && fs.existsSync(path.join(ORIG, "B", "original.html")));
ok(
  ORIG_LAYOUT_OK &&
  fs.readdirSync(path.join(ROOT, "authority")).sort().join(",") === "authority.json,sha256.txt",
  "T14b",
  "original/ + authority/ file sets intact"
);

// ---- independent boundary derivation ---------------------------------------
const a = aBuf.toString("utf8");
const b = bBuf.toString("utf8");
const so = a.indexOf("<style>");
const sc = a.indexOf("</style>");
const jo = a.indexOf("<script>");
const jc = a.indexOf("</script>");
const ia = a.indexOf("const imageUrls=");
const ie = a.indexOf("];", ia);
const jbo = b.indexOf("<script>");
const jbc = b.indexOf("</script>");
const ib = b.indexOf("const imageUrls=");
const ieb = b.indexOf("];", ib);
const styleSpan = a.slice(so, sc + 8);
const scriptHead = a.slice(jo, ia);
const stmtA = a.slice(ia, ie + 2);
const stmtB = b.slice(ib, ieb + 2);
const tail = a.slice(ie + 2, jc);
ok(
  a.replace(TITLE_A, "__T__").replace(stmtA, "__I__") ===
    b.replace(TITLE_B, "__T__").replace(stmtB, "__I__"),
  "T03",
  "semantic A/B diff is exactly {title, imageUrls statement}"
);
ok(b.slice(so, b.indexOf("</style>") + 8) === styleSpan, "T03b", "style span common A/B");
ok(b.slice(jbo, ib) === scriptHead && b.slice(ieb + 2, jbc) === tail, "T03c", "script head/tail common A/B");

// ---- split parts ------------------------------------------------------------
console.log("\nSplit part fidelity:");
const shell = readTxt(path.join(SPLIT, "index.html"));
const css = readTxt(path.join(SPLIT, "styles.css"));
const js = readTxt(path.join(SPLIT, "script.js"));
ok(css === a.slice(so + 7, sc), "T04", `styles.css === authority style inner (${css.length} chars)`);
const markerAt = js.indexOf(JS_MARKER);
ok(markerAt > 0, "T05a", "script.js carries tail marker");
const bootstrap = js.slice(0, markerAt);
const jsTail = js.slice(markerAt + JS_MARKER.length);
ok(jsTail === tail, "T05b", "script.js tail === authority common JS tail");
ok((js.match(/const imageUrls=/g) || []).length === 1, "T05c", "single imageUrls binding (selector-owned)");
ok(!js.includes("</script>"), "T05d", "no inline script terminator inside script.js");

// ---- variant data ------------------------------------------------------------
console.log("\nVariant data:");
const va = JSON.parse(readTxt(path.join(ASSETS, "variant-A.json")));
const vb = JSON.parse(readTxt(path.join(ASSETS, "variant-B.json")));
ok(JSON.stringify(va.imageUrls) === JSON.stringify(EXPECTED_A_URLS), "T06", "A imageUrls exactly 9 exact paths");
ok(JSON.stringify(vb.imageUrls) === JSON.stringify(EXPECTED_B_URLS), "T07", "B imageUrls exactly 9 exact paths");
ok(!vb.imageUrls.some((u) => /\/0\d\.png$/.test(u)) && !va.imageUrls.some((u) => u.includes("\ub3d9\uc591\uc778")), "T08/T09", "no cross-variant asset leakage");
ok(va.titleElement === TITLE_A && vb.titleElement === TITLE_B, "T19", "variant titles V3.3A vs V3.3B");
ok(va.jsImageUrlsStatement === stmtA && vb.jsImageUrlsStatement === stmtB, "T20", "variant JS literals byte-match authority");
for (const u of EXPECTED_A_URLS.concat(EXPECTED_B_URLS)) {
  if (!bootstrap.includes(`"${u}"`)) { ok(false, "T20b", `bootstrap embeds ${u}`); break; }
}
ok(bootstrap.includes(`"LoveTree Track68 V3.3A \u00b7 Codex Portals"`) && bootstrap.includes(`"LoveTree Track68 V3.3B \u00b7 Codex Portals"`), "T20c", "bootstrap embeds both titles");

// ---- selector fail-closed (bootstrap executed with stubs) --------------------
console.log("\nNeutral selector (fail-closed):");
const exprMatch = bootstrap.match(/^const imageUrls=((?:\(\(\)=>\{[\s\S]*\}\)\(\))|(?:\(\(\)\s*=>[\s\S]*\)\(\)));\s*$/);
ok(!!exprMatch, "T11a", "bootstrap shape is single const imageUrls IIFE");
const factory = new Function("window", "document", `return (${exprMatch[1]});`);
function resolvesTo(variant, urls, title) {
  const doc = {};
  const out = factory({ mediaVariant: variant }, doc);
  return Array.isArray(out) && out.length === 9 && JSON.stringify(out) === JSON.stringify(urls) && doc.title === title;
}
ok(resolvesTo("A", EXPECTED_A_URLS, TITLE_A.replace(/<\/?title>/g, "")), "T11b", 'mediaVariant "A" resolves A data + title');
ok(resolvesTo("B", EXPECTED_B_URLS, TITLE_B.replace(/<\/?title>/g, "")), "T11c", 'mediaVariant "B" resolves B data + title');
for (const [label, win] of [["missing", undefined], ["null", { mediaVariant: null }], ["undefined", { mediaVariant: undefined }], ["empty", { mediaVariant: "" }], ["C", { mediaVariant: "C" }], ["lowercase-a", { mediaVariant: "a" }], ["number", { mediaVariant: 1 }], ["AB", { mediaVariant: "AB" }]]) {
  let threw = false;
  try { factory(win, {}); } catch (e) { threw = /variant contract violation/.test(e.message); }
  ok(threw, `T10/T11-${label}`, `mediaVariant ${label} throws fail-closed`);
}
ok(!/default/i.test(bootstrap) || !/default\s*[:=]\s*["']?[AB]/i.test(bootstrap), "T11d", "no implicit default variant");
ok(shell.includes(TITLE_SENTINEL) && !shell.includes(TITLE_A) && !shell.includes(TITLE_B), "T11e", "shell carries no variant data (neutral)");

// ---- byte round-trip ----------------------------------------------------------
console.log("\nByte round-trip reconstruction:");
function reconstruct(titleEl, stmt) {
  return shell
    .replace(TITLE_SENTINEL, titleEl)
    .replace(LINK_LINE, `<style>${css}</style>`)
    .replace(SCRIPT_SRC_LINE, `<script>\n${stmt}${jsTail}</script>`);
}
const recA = reconstruct(TITLE_A, stmtA);
const recB = reconstruct(TITLE_B, stmtB);
ok(sha256(Buffer.from(recA, "utf8")) === LOCK_A, "T12", "A round-trip byte-identical to frozen authority");
ok(sha256(Buffer.from(recB, "utf8")) === LOCK_B, "T13", "B round-trip byte-identical to frozen authority");

// ---- shell structural checks ---------------------------------------------------
console.log("\nShell / policy checks:");
ok(shell.includes(LINK_LINE) && shell.includes(SCRIPT_SRC_LINE), "T05e", "shell reconnects via link + script src glue only");
const FORBIDDEN = [
  /from\s+['"]react['"]/i, /require\(\s*['"]react['"]\)/i, /React\.(createElement|Component|use)/,
  /\.tsx?\b/, /\bjsx\b/i, /next\/|__next|next\.js|from\s+['"]next['"]/i, /typescript/i,
  /import\s+[\s\S]*?\sfrom\s+['"]/,
];
const runtimeFiles = {
  "split/index.html": shell,
  "split/styles.css": css,
  "split/script.js": js,
  "split/assets/variant-A.json": JSON.stringify(va),
  "split/assets/variant-B.json": JSON.stringify(vb),
};
let forbHit = null;
for (const [f, content] of Object.entries(runtimeFiles)) {
  for (const re of FORBIDDEN) {
    if (re.test(content)) { forbHit = `${f} matches ${re}`; break; }
  }
  if (forbHit) break;
}
ok(!forbHit, "T15", forbHit || "no React/TS/TSX/JSX/Next/ESM in split runtime files");
const BACKEND = [/mongodb|postgres|mysql|firebase|supabase|drizzle/i, /fetch\(\s*['"]\/api/i, /AUTH_TOKEN|SECRET|API_KEY/i];
let backHit = null;
for (const [f, content] of Object.entries(runtimeFiles)) {
  for (const re of BACKEND) {
    if (re.test(content)) { backHit = `${f} matches ${re}`; break; }
  }
  if (backHit) break;
}
ok(!backHit, "T16", backHit || "no backend/DB/auth markers in split");
ok(!/mvp|product|route|adapter/i.test(shell + js), "T17", "no product/MVP adapter in split");
const MP4L = "https://d8j0ntlcm91z4.cloudfront.net/user_39ca84eAE1ODL9hbR5VhoEj8tBf/hf_20260625_154433_532a85d3-dabf-4265-b8bd-19ac6af31842.mp4";
const MP4R = "https://d8j0ntlcm91z4.cloudfront.net/user_39ca84eAE1ODL9hbR5VhoEj8tBf/hf_20260625_154401_a664f076-b971-4557-8728-40ef9ea4c49b.mp4";
ok(shell.includes(MP4L) && shell.includes(MP4R), "T18", "hero MP4 absolute URLs unchanged");

// ---- manifest flags --------------------------------------------------------------
console.log("\nManifest flags:");
const manifest = JSON.parse(readTxt(path.join(ROOT, "manifest.json")));
ok(manifest.stages.mechanical_split_complete === true, "T21a", "mechanical_split_complete=true");
ok(manifest.stages.source_split_parity_pass === true, "T21b", "source_split_parity_pass=true (S4 dual-variant parity accepted by CENTRAL)");
ok(manifest.parity_ref === "evidence/parity/accepted-parity.json", "T21b2", 'parity_ref="evidence/parity/accepted-parity.json"');
const acceptedParity = JSON.parse(readTxt(path.join(ROOT, "evidence", "parity", "accepted-parity.json")));
ok(
  acceptedParity.status === "ACCEPTED" &&
    acceptedParity.source_id === "SRC068" &&
    acceptedParity.authority?.variants?.A?.sha256 === LOCK_A &&
    acceptedParity.authority?.variants?.B?.sha256 === LOCK_B,
  "T21b3",
  "accepted parity record parses, is ACCEPTED for SRC068, and its dual-variant authority agrees with the frozen A/B originals"
);
ok(/^[0-9a-f]{40}$/.test(acceptedParity.source_head) && commitExists(acceptedParity.source_head), "T21b4", `accepted source_head ${acceptedParity.source_head} is a commit in this repository`);
ok(manifest.mechanical_split_ref === "split/materialization.json", "T21c", 'mechanical_split_ref="split/materialization.json"');
ok(
  manifest.authority.variants.A.sha256 === LOCK_A && manifest.authority.variants.B.sha256 === LOCK_B,
  "T21d",
  "manifest authority locks untouched"
);

// ---- evidence ----------------------------------------------------------------------
const report = {
  schema_version: "1.0",
  source_id: "SRC068",
  stage: "S3_MECHANICAL_SPLIT",
  run_at: new Date().toISOString(),
  authority: { A_sha256: LOCK_A, B_sha256: LOCK_B },
  reconstructed: {
    A_sha256: sha256(Buffer.from(recA, "utf8")),
    B_sha256: sha256(Buffer.from(recB, "utf8")),
  },
  roundtrip: { A: sha256(Buffer.from(recA, "utf8")) === LOCK_A, B: sha256(Buffer.from(recB, "utf8")) === LOCK_B },
  passed,
  failed,
  checks,
};
// Run evidence is written to a throwaway OS temp directory so that executing
// this test never dirties the work tree or overwrites the committed capsule
// record parity/s3-roundtrip.json (same rule as the post-#637 SRC066,
// post-#639 CDX014 and post-#642 SRC062 rebinds).
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "src068-s3-roundtrip-"));
fs.writeFileSync(path.join(tmpDir, "s3-roundtrip.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`Run evidence (temp, not committed): ${path.join(tmpDir, "s3-roundtrip.json")}`);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
