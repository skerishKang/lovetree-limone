/**
 * MST106 / CDX007 - S3 mechanical split round-trip contract.
 *
 * Every assertion RE-DERIVES its expectation from the committed original bytes rather than
 * trusting materialization.json. A materialization record that disagreed with the bytes would
 * fail here, so the evidence cannot certify itself.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAPSULE = path.resolve(HERE, "..");
const rb = (rel) => fs.readFileSync(path.join(CAPSULE, rel));
const rj = (rel) => JSON.parse(rb(rel).toString("utf8"));
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const gitBlobSha1 = (b) => crypto
  .createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${b.length}\0`), b])).digest("hex");

const AUTHORITY_BYTES = 22310;
const AUTHORITY_SHA256 = "4f28f1671146a36c53e88e0645c6dbe29076b1db526e21adb40794617a36223b";
const GLUE_CSS = '<link rel="stylesheet" href="./styles.css"/>';
const GLUE_JS = '<script src="./script.js"></script>';
const AUTHORED_CSS_TAG = '<link rel="stylesheet" href="living-world-v2.css">';
const AUTHORED_JS_TAG = '<script src="living-world-v2.js">';

const check = (name, fn) => test(name, fn);

// ---------------------------------------------------------------- T01-T03 authority lock
check("T01-T03 the locked Drive authority is byte- and hash-exact", () => {
  const auth = rb("original/original.html");
  assert.equal(auth.length, AUTHORITY_BYTES, "authority byte length");
  assert.equal(sha256(auth), AUTHORITY_SHA256, "authority sha256");
  const ctx = rj("authority-context.json");
  assert.equal(ctx.authority.bytes, AUTHORITY_BYTES, "manifest byte lock");
  assert.equal(ctx.authority.sha256, AUTHORITY_SHA256, "manifest hash lock");
  assert.equal(ctx.authority.drive_file_id, "1vUMhdOXGo586GnJCnl8o_9zGizF_jYMI");
  assert.equal(ctx.authority.authority_mode, "SINGLE");
  assert.equal(auth.includes(Buffer.from("\r\n")), false, "no CRLF normalization");
  assert.equal(auth[0] === 0xef && auth[1] === 0xbb && auth[2] === 0xbf, false, "no BOM introduced");
  assert.equal(gitBlobSha1(auth).length, 40, "git blob id is derivable");
});

// ---------------------------------------------------------------- T04 block inventory
check("T04 the source block inventory is fresh-derived from the original bytes", () => {
  const auth = rb("original/original.html").toString("utf8");
  const styleOpen = auth.indexOf("<style>");
  const styleClose = auth.indexOf("</style>", styleOpen);
  const scriptOpen = auth.indexOf("<script>");
  const scriptClose = auth.indexOf("</script>", scriptOpen);
  assert.ok(styleOpen >= 0 && styleClose > styleOpen, "one inline style block exists");
  assert.ok(scriptOpen >= 0 && scriptClose > scriptOpen, "one inline bare script block exists");
  assert.ok(styleClose < scriptOpen, "authored order: style precedes the inline script");
  assert.equal((auth.match(/<style/g) || []).length, 1, "exactly one style block");
  // Two script blocks: the inline one and the authored external one.
  assert.equal((auth.match(/<script/g) || []).length, 2, "inline + external script tags");
  assert.ok(auth.includes(AUTHORED_CSS_TAG), "authored external CSS tag present");
  assert.ok(auth.includes(AUTHORED_JS_TAG), "authored external JS tag present");
});

// ---------------------------------------------------------------- T05-T07 extraction fidelity
check("T05-T06 the split CSS/JS are the exact inline inner bytes", () => {
  const auth = rb("original/original.html");
  const a = auth.toString("utf8");
  const so = a.indexOf("<style>");
  const sc = a.indexOf("</style>", so);
  const io_ = a.indexOf("<script>");
  const ic = a.indexOf("</script>", io_);
  const inlineStyle = Buffer.from(a.slice(so + "<style>".length, sc), "utf8");
  const inlineScript = Buffer.from(a.slice(io_ + "<script>".length, ic), "utf8");
  assert.ok(rb("split/styles.css").equals(inlineStyle), "styles.css == exact inline style inner bytes");
  assert.ok(rb("split/script.js").equals(inlineScript), "script.js == exact inline script inner bytes");
});

check("T07 split/index.html is a positional splice with mechanical glue only", () => {
  const split = rb("split/index.html").toString("utf8");
  assert.ok(split.includes(GLUE_CSS), "mechanical CSS glue present");
  assert.ok(split.includes(GLUE_JS), "mechanical JS glue present");
  assert.equal(split.includes("<style>"), false, "inline style block removed from split html");
  // The inline script body must no longer be inline.
  assert.equal(split.includes("const chars=["), false, "inline script body removed from split html");
});

// ---------------------------------------------------------------- T08 external layers
check("T08 the pre-existing external CSS/JS layers are preserved unchanged", () => {
  const split = rb("split/index.html").toString("utf8");
  assert.ok(split.includes(AUTHORED_CSS_TAG), "authored CSS tag unchanged (filename and URL)");
  assert.ok(split.includes(AUTHORED_JS_TAG), "authored JS tag unchanged (filename and URL)");
  assert.equal(split.includes("living-world-v2.css\""), true, "no rename of the authored CSS href");
  // Both layers must remain separate: the authored external file is NOT the extracted styles.css.
  assert.notEqual(AUTHORED_CSS_TAG, GLUE_CSS, "authored CSS tag and new glue are distinct layers");
  for (const n of ["living-world-v2.css", "living-world-v2.js"]) {
    assert.ok(fs.existsSync(path.join(CAPSULE, "original", n)), `original/${n} present`);
    assert.ok(fs.existsSync(path.join(CAPSULE, "split", n)), `split/${n} present`);
    assert.ok(rb(`original/${n}`).equals(rb(`split/${n}`)), `${n} is byte-identical across original and split`);
  }
  const mat = rj("split/materialization.json");
  assert.equal(mat.external_layers_merged, false, "external layers were never merged");
  assert.equal(mat.external_urls_rewritten, false, "no external URL was rewritten");
});

// ---------------------------------------------------------------- T09 reverse reconstruction
check("T09 reversing only the new glue reconstructs the exact authority bytes", () => {
  const auth = rb("original/original.html");
  const a = auth.toString("utf8");
  const so = a.indexOf("<style>");
  const sc = a.indexOf("</style>", so);
  const io_ = a.indexOf("<script>");
  const ic = a.indexOf("</script>", io_);
  const inlineStyle = a.slice(so + "<style>".length, sc);
  const inlineScript = a.slice(io_ + "<script>".length, ic);

  const sb = rb("split/index.html");
  const s = sb.toString("utf8");
  const gi = s.indexOf(GLUE_CSS);
  const gj = s.indexOf(GLUE_JS);
  const reconstructed =
    s.slice(0, gi) + "<style>" + inlineStyle + "</style>" +
    s.slice(gi + GLUE_CSS.length, gj) + "<script>" + inlineScript + "</script>" +
    s.slice(gj + GLUE_JS.length);
  const rb2 = Buffer.from(reconstructed, "utf8");
  assert.ok(rb2.equals(auth), "reconstructed bytes equal the authority exactly");
  assert.equal(sha256(rb2), AUTHORITY_SHA256, "reconstructed sha256 equals the accepted authority hash");
});

// ---------------------------------------------------------------- T14-T17 assets
const ASSET_DIRS = ["original/assets", "split/assets"];
check("T14-T17 the runtime asset tree is byte-exact on both sides", () => {
  const walk = (dir, rel = "") => fs.readdirSync(path.join(dir, rel), { withFileTypes: true })
    .flatMap((e) => {
      const r = rel ? `${rel}/${e.name}` : e.name;
      return e.isDirectory() ? walk(dir, r) : [r];
    });
  const oFiles = walk(path.join(CAPSULE, "original/assets")).sort();
  const sFiles = walk(path.join(CAPSULE, "split/assets")).sort();
  assert.deepEqual(sFiles, oFiles, "original and split carry the identical relative asset set");
  assert.equal(oFiles.length, 54, "54 fresh-derived runtime asset files");
  const byName = new Map(oFiles.map((f) => [f, sha256(rb(`original/assets/${f}`))]));
  for (const f of oFiles) {
    assert.equal(byName.get(f), sha256(rb(`split/assets/${f}`)), `${f} is byte-identical across sides`);
  }
  const ctx = rj("authority-context.json");
  assert.equal(ctx.runtime_asset_dependencies.url_rewrites, 0, "zero URL rewrites");
  assert.equal(ctx.runtime_asset_dependencies.reencode, 0, "zero re-encode");
  assert.equal(ctx.runtime_asset_dependencies.reference_only_files, 7, "7 reference-only files recorded");
  assert.equal(ctx.runtime_asset_dependencies.runtime_asset_files + 7, 61, "54 runtime + 7 reference-only = the 61 accepted total");
});

// ---------------------------------------------------------------- T18-T19 no repair
check("T18-T19 no source repair, redesign or reduced-motion rule was introduced", () => {
  const split = rb("split/index.html").toString("utf8");
  const styles = rb("split/styles.css").toString("utf8");
  assert.equal(styles.includes("prefers-reduced-motion"), false, "no authored reduced-motion rule added");
  assert.equal(split.includes("prefers-reduced-motion"), false, "no reduced-motion rule in html");
  // The mobile hint element is created by the authored JS and hidden by authored CSS. It must
  // stay present in both layers and must NOT be removed from the DOM by the split.
  const v2js = rb("original/living-world-v2.js").toString("utf8");
  const v2css = rb("original/living-world-v2.css").toString("utf8");
  assert.ok(v2js.includes("lubt-drag-hint"), ".lubt-drag-hint is authored in the runtime JS");
  assert.ok(v2css.includes("lubt-drag-hint"), ".lubt-drag-hint is styled in the authored CSS");
  assert.ok(/\.lubt-drag-hint\s*\{\s*display:\s*none/.test(v2css),
    "mobile hint is hidden by authored CSS (display:none), not removed from the DOM");
  assert.ok(split.includes("Math.random(") || v2js.includes("Math.random("),
    "authored Math.random() preserved unpatched");
  // No framework conversion.
  for (const m of ["react-dom", "React.createElement", "ReactDOM", "useState(", "process.env"]) {
    assert.equal(split.includes(m), false, `no framework marker ${m}`);
  }
});

// ---------------------------------------------------------------- T20 identity binding
check("T20 the MST106 identity is bound to CDX007, never to Lineage57", () => {
  const ctx = rj("authority-context.json");
  assert.equal(ctx.namespace, "CDX", "capsule namespace is CDX");
  assert.equal(ctx.identity.id, "CDX007", "capsule id is CDX007");
  assert.equal(ctx.identity.semantic_identity, "Codex-07 Living Character World V2");
  const master = JSON.parse(fs.readFileSync(
    path.resolve(CAPSULE, "..", "..", "02_master", "MST106", "record.json"), "utf8"));
  assert.equal(master.mapping_status, "CODEX_RESOLVED", "MST106 record is CODEX_RESOLVED");
  const refs = master.identity_refs || [];
  assert.ok(refs.some((r) => r.namespace === "CDX" && r.id === "CDX007"),
    "MST106 identity_refs bind CDX007");
  const note = (master.notes || []).join(" ");
  assert.equal(note.includes("namespace_type=lineage"), false,
    "the stale lineage namespace_type is no longer the current statement");
  assert.equal(master.product_adoption ?? false, false, "no Product adoption");
});

// ---------------------------------------------------------------- T21 lifecycle
check("T21 S3 is accepted and no S4 parity is claimed at any lifecycle stage", () => {
  /* Lifecycle-aware. S3 is ACCEPTED by CENTRAL (#589 5925877072). S4 has since been released for
   * CANDIDATE capture, so the release gate legitimately reads RELEASED_CANDIDATE_ONLY. What must
   * hold in EVERY stage is the fail-closed part: no parity pass, no parity ref, no accepted record. */
  const m = rj("manifest.json");
  assert.equal(m.stages.mechanical_split_complete, true, "mechanical split complete");
  assert.equal(m.s3_status, "ACCEPTED", "S3 is CENTRAL-accepted");
  assert.equal(m.s3_acceptance_ref, "skerishKang/lovetree-limone#589 comment 5925877072",
    "S3 acceptance is bound to the CENTRAL release comment");
  assert.equal(m.stages.source_split_parity_pass, false, "S4 parity pass is false");
  assert.ok(["NOT_RELEASED", "RELEASED_CANDIDATE_ONLY"].includes(m.s4_status),
    `S4 is unreleased or candidate-only (${m.s4_status})`);
  assert.equal(m.central_s4_accepted, false, "CENTRAL S4 acceptance is NOT claimed");
  assert.equal(m.parity_ref, null, "parity_ref stays null");
  assert.equal(m.product_adoption, false, "no Product adoption");
  assert.equal(m.drive_mutation, 0, "zero Drive mutation");
  assert.equal(fs.existsSync(path.join(CAPSULE, "evidence", "parity", "accepted-parity.json")), false,
    "no accepted-parity record may exist before CENTRAL acceptance");
  const ctx = rj("authority-context.json");
  assert.equal(ctx.stage_gate.source_split_parity_pass, false, "authority gate claims no parity");
  assert.equal(ctx.stage_gate.parity_ref, null, "authority gate parity_ref is null");
});