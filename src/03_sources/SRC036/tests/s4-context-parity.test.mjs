/**
 * SRC036 S4 context-aware motion/state parity — contract + real-browser mode.
 *
 * Contract mode (default):
 *   node src/03_sources/SRC036/tests/s4-context-parity.test.mjs
 *
 * Real-browser mode:
 *   SRC036_S4_BROWSER=1
 *   SRC036_S4_SIBLING=<exact 111950-byte sibling path>
 *   SRC036_S4_OUT=<evidence directory outside Git>
 *   SRC_EXACT_HEAD=<40-hex PR head>
 *   SRC036_S4_WRITE_CAPSULE_EVIDENCE=1
 *   node src/03_sources/SRC036/tests/s4-context-parity.test.mjs
 *
 * The runner never changes the Source, injects QA hooks, patches clocks or
 * timers, or writes final parity acceptance flags. A successful browser run
 * produces candidate evidence only; CENTRAL owns final visual acceptance.
 */

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {
  AUTHORITY_BYTES,
  AUTHORITY_SHA256,
  SIBLING_BYTES,
  SIBLING_SHA256,
  CONTEXT_ENCODED_PATH,
  CONTEXT_RELATIVE_PATH,
  EXPECTED_STATE_COUNT,
  runContextParity,
  writeCandidateEvidence,
} from "./lib/s4-context-parity-runner.mjs";

const CAPSULE = path.resolve(import.meta.dirname, "..");
const REPO = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const manifest = readJson(path.join(CAPSULE, "manifest.json"));
const materialization = readJson(path.join(CAPSULE, "split", "materialization.json"));
const authorityContext = readJson(path.join(CAPSULE, "authority-context.json"));
const authorityBytes = fs.readFileSync(path.join(CAPSULE, "original", "original.html"));
const siblingPath = process.env.SRC036_S4_SIBLING;

assert.equal(manifest.source_id, "SRC036");
assert.equal(manifest.authority.bytes, AUTHORITY_BYTES);
assert.equal(manifest.authority.sha256, AUTHORITY_SHA256);
assert.equal(authorityBytes.length, AUTHORITY_BYTES);
assert.equal(manifest.stages.mechanical_split_complete, true);
assert.equal(manifest.stages.source_split_parity_pass, false);
assert.equal(manifest.parity_ref, null);
assert.equal(manifest.capture_surface.mode, "CONTEXT_AWARE_ONLY");
assert.equal(manifest.capture_surface.shared_harness_disposition["capture-source-baseline.mjs"], "SKIP");
assert.equal(manifest.capture_surface.shared_harness_disposition["capture-source-parity.mjs"], "SKIP");
assert.equal(authorityContext.runtime.sibling_dependency.sibling_identity_metadata_only.bytes, SIBLING_BYTES);
assert.equal(authorityContext.runtime.sibling_dependency.sibling_identity_metadata_only.sha256, SIBLING_SHA256);
assert.equal(materialization.round_trip_evidence.byte_identical, true);
assert.equal(materialization.parity_ref, null);
assert.equal(materialization.status, "MATERIALIZED_PENDING_PARITY");
assert.equal(materialization.source_candidate.artifact_path, "/src-mechanical-split-candidate/SRC036");
assert.equal(CONTEXT_RELATIVE_PATH, decodeURIComponent(CONTEXT_ENCODED_PATH));
assert.equal(EXPECTED_STATE_COUNT, 20);
assert.equal(manifest.source_contract.backend_scope, "BACKEND_FREE");
assert.ok(!fs.existsSync(path.join(CAPSULE, "evidence", "parity", "accepted-parity.json")), "final S4 acceptance must not exist before CENTRAL review");

console.log("SRC036_S4_CONTRACT_CHECKS=14");
console.log("SRC036_S4_MODE=CONTRACT_ONLY");
console.log("BROWSER_LAUNCHED=false");

if (process.env.SRC036_S4_BROWSER !== "1") process.exit(0);

assert(siblingPath, "SRC036_S4_BROWSER=1 requires SRC036_S4_SIBLING");
const outDir = path.resolve(process.env.SRC036_S4_OUT || "D:\\Temp\\opencode\\src036-s4-candidate");
const head = process.env.SRC_EXACT_HEAD;
assert(/^[0-9a-f]{40}$/.test(String(head)), "SRC036_S4_BROWSER=1 requires a 40-hex SRC_EXACT_HEAD");
const relativeOut = path.relative(REPO, outDir);
assert(relativeOut.startsWith("..") || path.isAbsolute(relativeOut), "SRC036_S4_OUT must be outside the Git worktree");
fs.mkdirSync(outDir, { recursive: true });

const result = await runContextParity({ capsuleDir: CAPSULE, siblingPath: path.resolve(siblingPath), outDir, head });
if (process.env.SRC036_S4_WRITE_CAPSULE_EVIDENCE === "1") {
  writeCandidateEvidence(CAPSULE, result);
}
const failed = result.gate.filter((entry) => !entry.ok);
console.log(`SRC036_S4_PARITY_CHECKS=${result.gate.length}`);
console.log(`SRC036_S4_GATE=${result.gate.length - failed.length}/${result.gate.length} PASS`);
console.log(`SRC036_S4_VERDICT=${result.evidence.worker_disposition}`);
console.log(`SRC036_S4_BLOCKERS=${failed.length === 0 ? "NONE" : failed.map((entry) => entry.name).join("+")}`);
console.log("BROWSER_LAUNCHED=true");
if (failed.length) process.exitCode = 1;
