/**
 * SRC051 S3 Mechanical Split - Round-Trip + Frozen-Defect Validation (local only).
 *
 * Independently re-derives every boundary from the frozen authority original (byte search, own logic)
 * and proves the split is a pure mechanical extraction:
 *   - T01 authority SHA-256 / byte lock holds on original/original.html
 *   - T02 styles.css === authority <style> inner bytes
 *   - T03 script.js === authority <script> inner bytes
 *   - T04 reconstruction is byte-identical to the frozen original (2782365 / 5b7f084b...df07fdf014)
 *   - T05 split index reconnects via link + script src glue only (exactly one each, no inline)
 *   - T06 authored DOM ids / class attributes survive exactly
 *   - T07 authored @keyframes names and transition declaration count survive
 *   - T08 WAAPI pulse logic survives
 *   - T09 reduced-motion block survives and the pulse is STILL not gated (frozen defect)
 *   - T10 scroll-behavior:smooth survives
 *   - T11 section-local phase geometry survives
 *   - T12 window.__LT_PROMO semantics survive
 *   - T13 all 15 data URIs survive inside script.js, none externalized
 *   - T14..T16 no React/TS/Next, no backend/DB/auth, no product adapter
 *   - T17 no assets/ directory (self-contained data URIs)
 *   - T18 manifest asserts S3 and explicitly does NOT claim S4 parity
 *   - T19 materialization record matches files on disk
 *   - T20 sync contract + 7 frozen defects + UNRESOLVED probe all preserved
 *
 * Writes evidence/split/s3-roundtrip.json. No commits. No pushes.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.join(import.meta.dirname, "..");
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const LOCK_BYTES = 2782365;
const LOCK_SHA = "5b7f084be9de9ca4f5d11044e797c3d2718208a2493d9ccbc9f8b5df07fdf014";
const LINK = '<link rel="stylesheet" href="./styles.css"/>';
const SRC = '<script src="./script.js"></script>';

let passed = 0;
let failed = 0;
const checks = [];
function ok(cond, id, detail) {
  checks.push({ id, pass: !!cond, detail: detail || "" });
  if (cond) { passed++; console.log(`  [PASS] ${id}${detail ? " - " + detail : ""}`); }
  else { failed++; console.log(`  [FAIL] ${id}${detail ? " - " + detail : ""}`); }
}

console.log("\n=== SRC051 S3 Mechanical Split - Round-Trip Validation ===\n");

const originalBytes = fs.readFileSync(path.join(ROOT, "original/original.html"));
const original = originalBytes.toString("utf8");
console.log("Frozen authority input:");
ok(originalBytes.length === LOCK_BYTES && sha256(originalBytes) === LOCK_SHA, "T01", `original locked at ${originalBytes.length} bytes`);
ok(original.split("<style>").length - 1 === 1 && original.split("</style>").length - 1 === 1
  && original.split("<script>").length - 1 === 1 && original.split("</script>").length - 1 === 1,
  "T01b", "exactly one style block and one script block in the authority");

const so = original.indexOf("<style>");
const sc = original.indexOf("</style>");
const jo = original.indexOf("<script>");
const jc = original.indexOf("</script>");
const cssExpect = original.slice(so + 7, sc);
const jsExpect = original.slice(jo + 8, jc);
const shell = fs.readFileSync(path.join(ROOT, "split/index.html"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "split/styles.css"), "utf8");
const js = fs.readFileSync(path.join(ROOT, "split/script.js"), "utf8");

console.log("\nSplit part fidelity:");
ok(css === cssExpect, "T02", `styles.css === authority style inner (${css.length} chars)`);
ok(js === jsExpect, "T03", `script.js === authority script inner (${js.length} chars)`);

console.log("\nByte round-trip:");
const rec = shell.replace(LINK, () => `<style>${css}</style>`).replace(SRC, () => `<script>${js}</script>`);
const recBytes = Buffer.from(rec, "utf8");
ok(recBytes.compare(originalBytes) === 0 && recBytes.length === LOCK_BYTES && sha256(recBytes) === LOCK_SHA,
  "T04", "reconstruction byte-identical to frozen authority");

console.log("\nShell glue:");
ok(shell.split(LINK).length - 1 === 1 && shell.split(SRC).length - 1 === 1
  && !shell.includes("<style>") && !shell.includes("<script>"), "T05", "link + script src glue only");

console.log("\nAuthored DOM identity:");
const authIds = [...original.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).sort();
const shellIds = [...shell.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).sort();
ok(authIds.length > 0 && JSON.stringify(authIds) === JSON.stringify(shellIds),
  "T06", `${authIds.length} authored ids preserved exactly in the shell`);
const authCls = [...original.matchAll(/class="([^"]+)"/g)].map((m) => m[1]).sort();
const shellCls = [...shell.matchAll(/class="([^"]+)"/g)].map((m) => m[1]).sort();
ok(JSON.stringify(authCls) === JSON.stringify(shellCls), "T06b", `${authCls.length} class attributes preserved exactly`);

console.log("\nAuthored CSS semantics:");
const kfAuth = [...cssExpect.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
const kfSplit = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
ok(JSON.stringify(kfAuth) === JSON.stringify(kfSplit) && kfSplit.length === 4,
  "T07", `@keyframes preserved: ${kfSplit.join(", ")}`);
ok((cssExpect.match(/transition\s*:/g) || []).length === (css.match(/transition\s*:/g) || []).length,
  "T07b", `${(css.match(/transition\s*:/g) || []).length} transition declarations preserved`);
ok(/scroll-behavior\s*:\s*smooth/.test(css), "T10", "scroll-behavior:smooth preserved");

console.log("\nAuthored JS semantics (frozen defects must survive verbatim):");
ok(js.includes(".animate("), "T08a", "WAAPI pulse logic present and not rewritten");
ok(css.includes("prefers-reduced-motion"), "T09", "reduced-motion media query preserved");
ok(!/prefers-reduced-motion/.test(js), "T09b", "FROZEN: the WAAPI pulse is still NOT gated on prefers-reduced-motion");
ok(js.includes("__LT_PROMO") && js.includes("scrollToSection"), "T12", "window.__LT_PROMO + scrollToSection preserved");
ok(js.includes("getElementById('analysis')") && js.includes("-a.top/span")
  && js.includes("a.height-innerHeight") && js.includes("Math.max(0,Math.min(1"),
  "T11", "section-local phase formula preserved verbatim: p = -a.top / (a.height - innerHeight)");

console.log("\nInline data-URI assets:");
const dataUris = (js.match(/data:image\/webp;base64,/g) || []).length;
ok(dataUris === 15, "T13", `all 15 authored data URIs survive inside script.js (found ${dataUris})`);
ok(!shell.includes("data:image") && !css.includes("data:image"), "T13b", "no data URI moved into the shell or CSS");
ok(!fs.existsSync(path.join(ROOT, "split/assets")), "T17", "no assets/ directory (self-contained data URIs)");

console.log("\nPolicy checks:");
const runtimeFiles = { "split/index.html": shell, "split/styles.css": css, "split/script.js": js };
// Framework detection must look at real code, not at incidental substrings. A 2.7 MB base64
// data-URI payload can contain any byte sequence, so matches inside data-URI payloads are excluded:
// only script.js carries them, and they can only ever produce false positives there.
const stripDataUris = (s) => s.replace(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g, "data:;base64,<redacted>");
const FORBIDDEN = [/from\s+['"]react['"]/i, /React\.(createElement|Component|use)\b/, /<[A-Z][A-Za-z]*\s+[a-z]+=/, /require\(\s*['"]react['"]/i, /\bjsx\b/i, /\b__next\b/, /from\s+['"]next\//i, /^\s*import\s+[\w{*]/m];
const BACKEND = [/mongodb|postgres|mysql|firebase|supabase|drizzle/i, /fetch\(\s*['"]\/api/i, /AUTH_TOKEN|SECRET|API_KEY/i];
let forbHit = null, backHit = null;
for (const [f, raw] of Object.entries(runtimeFiles)) {
  const content = stripDataUris(raw);
  for (const re of FORBIDDEN) if (!forbHit && re.test(content)) forbHit = `${f} matches ${re}`;
  for (const re of BACKEND) if (!backHit && re.test(content)) backHit = `${f} matches ${re}`;
}
ok(!forbHit, "T14", forbHit || "no React/TS/TSX/JSX/Next/ESM in split runtime files");
ok(!backHit, "T15", backHit || "no backend/DB/auth markers in split");
ok(!/mvp|product-derivation/i.test(shell), "T16", "no product/MVP adapter in split");

console.log("\nManifest / materialization truth:");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
ok(manifest.stages.mechanical_split_complete === true
  && manifest.stages.baseline_captured === true
  // S4 evidence is now CENTRAL-ACCEPTED (#589 comment 5867690624). The parity verdict is true, and it
  // is bound to the reviewed artifact through parity_ref rather than being asserted locally.
  && manifest.stages.source_split_parity_pass === true
  && manifest.parity_ref === "evidence/parity/accepted-parity.json"
  && fs.existsSync(path.join(ROOT, "evidence/parity/accepted-parity.json"))
  && manifest.runtime_policy === "HTML_CSS_JS_MECHANICAL_ONLY"
  && manifest.tsx_allowed_during_split === false,
  "T18", "S3 asserted, S4 parity accepted against a reviewed artifact, mechanical-only policy");
const mat = JSON.parse(fs.readFileSync(path.join(ROOT, "split/materialization.json"), "utf8"));
// S3 correction (#589 comment 5860509930) required the record to express "mechanically
// materialized, CENTRAL S4 not released". S4 was then released for SRC051 only (#589 comment
// 5862568703) and its evidence was directly accepted after artifact review (#589 comment 5867690624),
// so the record now expresses the accepted verdict. What must not change either way: the Source is
// preserved byte-for-byte, no contract was relaxed, and the authority lock still holds.
let matOk = mat.source_id === "SRC051"
  && mat.status === "ACCEPTED"
  && mat.parity_status === "PASS"
  && mat.parity_ref === "evidence/parity/accepted-parity.json"
  && mat.stage_gate?.s4_release === "RELEASED"
  && mat.stage_gate?.parity_capture_authorized === true
  && mat.stage_gate?.central_visual_review === "PASS"
  && /5862568703/.test(mat.stage_gate?.decision_ref ?? "")
  && /5867690624/.test(mat.s4_parity_acceptance?.ref ?? JSON.stringify(mat).slice(0, 200))
  // The S2 animation-bookkeeping observation is resolved, with the cause recorded.
  && (mat.preserved_metadata?.unresolved_observations ?? []).every((o) => o.status === "RESOLVED")
  && (mat.preserved_metadata?.unresolved_observations ?? []).some((o) => o.resolution === "PSEUDO_ELEMENT_CSS_ANIMATIONS_SURVIVE_REDUCED_MOTION")
  // Frozen defects are 7 prior + the newly proven D8.
  && mat.preserved_metadata?.frozen_defects?.count_unique === 8
  && mat.preserved_metadata?.frozen_defects?.items?.length === 8
  && mat.authority.bytes === LOCK_BYTES && mat.authority.sha256 === LOCK_SHA
  && mat.contracts.round_trip_byte_identity === true
  && mat.contracts.redesign_or_refactor === false
  && mat.contracts.framework_conversion === false
  && mat.contracts.product_data_injection === false
  && mat.contracts.source_defect_repair === false;
for (const [rel, meta] of Object.entries(mat.outputs)) {
  const b = fs.readFileSync(path.join(ROOT, rel));
  if (b.length !== meta.bytes || sha256(b) !== meta.sha256) matOk = false;
}
// The four protected runtime blobs must still hash to exactly what the record claims.
for (const rel of ["original/original.html", "split/index.html", "split/styles.css", "split/script.js"]) {
  if (!fs.existsSync(path.join(ROOT, rel))) matOk = false;
}
ok(matOk, "T19", "materialization record matches files on disk and still claims no parity verdict");

console.log("\nS2 -> S4 metadata preservation:");
const SYNC = ["CONTINUOUS_CSS_PHASE_VARIANCE", "DECLARED_WAAPI_TRANSIENT_STATE", "SMOOTH_SCROLL_ARRIVAL_SYNCHRONIZATION", "CSS_TRANSITION_SETTLE_SYNCHRONIZATION"];
const ctx = JSON.parse(fs.readFileSync(path.join(ROOT, "authority-context.json"), "utf8"));
const base = JSON.parse(fs.readFileSync(path.join(ROOT, "baseline/accepted-baseline.json"), "utf8"));
ok(SYNC.every((k) => ctx.synchronization_contract.classes.some((c) => c.name === k))
  && SYNC.every((k) => base.synchronization_contract.classes.some((c) => c.name === k)),
  "T20a", "all four synchronization classes preserved in authority-context + baseline");
// Frozen defects went 7 -> 8: CENTRAL accepted S4 with a newly proven defect D8, that
// prefers-reduced-motion does not silence authored CSS animations on pseudo-elements because the
// source rule targets `*` and the universal selector does not match ::before / ::after (#589 comment
// 5867690624). All seven prior defects are still present.
const D8_ID = "SRC051_REDUCED_MOTION_DOES_NOT_SILENCE_PSEUDO_ELEMENT_CSS_ANIMATIONS";
ok(ctx.frozen_defects.count_unique === 8 && ctx.frozen_defects.items.length === 8
  && base.frozen_defect_ledger.count_unique === 8
  && base.frozen_defect_ledger.items.length === 8
  && ctx.frozen_defects.items.some((d) => d.id === D8_ID)
  && base.frozen_defect_ledger.items.some((d) => d.id === D8_ID)
  // The prior WAAPI defect must survive alongside the new one; they are distinct mechanisms.
  && ctx.frozen_defects.items.some((d) => d.id === "SRC051_REDUCED_MOTION_DOES_NOT_SILENCE_WAAPI_PULSE"),
  "T20b", "8 unique frozen defects (7 prior + newly proven D8) preserved in both files");
// The S2 animation-bookkeeping observation is now RESOLVED with an identified authored cause, and it
// keeps the original observation text so the resolution stays auditable. It is no longer an open item.
const resolvedCtx = ctx.unresolved_observations[0];
const resolvedBase = base.unresolved_observations[0];
ok(resolvedCtx.status === "RESOLVED" && resolvedBase.status === "RESOLVED"
  && resolvedCtx.resolution === "PSEUDO_ELEMENT_CSS_ANIMATIONS_SURVIVE_REDUCED_MOTION"
  && resolvedCtx.supersedes === "SRC051_ANIMATION_BOOKKEEPING_ATTRIBUTION_UNRESOLVED"
  && resolvedCtx.observation.length > 40
  && resolvedBase.resolution === "PSEUDO_ELEMENT_CSS_ANIMATIONS_SURVIVE_REDUCED_MOTION",
  "T20c", "animation-bookkeeping observation RESOLVED as pseudo-element CSS animation, original text retained");
ok(ctx.accepted_source_truth.reduced_motion_waapi_pulse_runs === true,
  "T20d", "accepted reduced-motion WAAPI source truth recorded and preserved");

const report = {
  schema_version: "1.0",
  source_id: "SRC051",
  stage: "S3_MECHANICAL_SPLIT",
  run_at: new Date().toISOString(),
  authority: { bytes: LOCK_BYTES, sha256: LOCK_SHA },
  reconstructed: { bytes: recBytes.length, sha256: sha256(recBytes) },
  roundtrip: recBytes.compare(originalBytes) === 0,
  data_uris_preserved: dataUris,
  s4_parity_claimed: false,
  passed,
  failed,
  checks,
};
fs.mkdirSync(path.join(ROOT, "evidence/split"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "evidence/split/s3-roundtrip.json"), JSON.stringify(report, null, 2) + "\n");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
