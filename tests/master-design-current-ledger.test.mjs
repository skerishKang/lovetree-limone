import assert from "node:assert/strict";
import fs from "node:fs";

const readJson = (path) => JSON.parse(fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));

const baseline = readJson("design-intake/master-design-coverage.json");
const current = readJson("design-intake/master-design-current-ledger.json");
const codex = readJson("design-intake/codex-current-implementation-overlay.json");

assert.equal(current.kind, "lovetree-master-current-resolver-ledger");
assert.equal(current.tracking_issue, 527);
assert.equal(current.inputs.baseline, "design-intake/master-design-coverage.json");
assert.equal(current.inputs.codex, "design-intake/codex-current-implementation-overlay.json");

assert.equal(baseline.summary.total, 108);
assert.equal(baseline.summary.normalized_family_count_working, 88);
assert.equal(current.resolution.rows, 108);
assert.equal(current.resolution.families, 88);
assert.equal(Object.keys(current.current_overrides).length, 23);
assert.equal(Object.keys(current.product_jobs).length, 10);

const byId = new Map(baseline.rows.map((row) => [row.master_id, row]));
const familyKey = (row) => {
  if (row.family_anchor_master_id != null) {
    const anchor = byId.get(row.family_anchor_master_id);
    assert.ok(anchor, `missing family anchor ${row.family_anchor_master_id}`);
    return anchor.semantic_identity;
  }
  return row.semantic_identity;
};

assert.ok(baseline.rows.every((row) => typeof row.semantic_identity === "string" && row.semantic_identity.length > 0));
const materializedFamilies = new Set(baseline.rows.map(familyKey));
assert.equal(
  materializedFamilies.size,
  baseline.summary.normalized_family_count_working,
  "current resolver must materialize the working normalized family count",
);

assert.equal(current.resolution.unoverridden, "INHERIT_BASELINE");
assert.equal(current.resolution.unknown, "NULL_OR_HOLD_NEVER_GUESS");

const o = current.current_overrides;
assert.equal(o.Codex13.state, "MERGED");
assert.equal(o.Codex13.main, true);
assert.equal(o.Codex13.route, "/v4/trees/:treeId/archive/video-wall");
assert.equal(o.Codex15.state, "MERGED");
assert.equal(o.Codex15.main, true);
assert.equal(o.Codex15.route, "/v4/memory-biosphere");
assert.equal(o.Track09.state, "CENTRAL_519_MERGED__WORKER_499_OPEN_STALE");
assert.equal(o.Track09.hold, "WORKER_499_SUPERSEDED");

for (const key of ["Source64", "Source58", "Source57", "Source56", "Source60"]) {
  assert.equal(o[key].impl, "CANONICAL_FIVE_SOURCE_INTEGRATED");
  assert.equal(o[key].main, true);
  assert.equal(o[key].qa, "FIVE_SOURCE_CONTINUITY_GREEN");
}
assert.equal(current.five_source.state, "COMPLETE_MERGED_MAIN");
assert.equal(current.five_source.routes["SOURCE:64"], "/trees/:treeId/portal");
assert.equal(current.five_source.routes["SOURCE:58"], "/trees/:treeId/board");
assert.equal(current.five_source.routes["SOURCE:57"], "/trees/:treeId");
assert.equal(current.five_source.routes["SOURCE:56"], "/trees/:treeId/relationships");
assert.equal(current.five_source.routes["SOURCE:60"], "/trees/:treeId/explore");

const gaps = current.source_native_gaps;
assert.equal(gaps["CODEX:02"].bytes, 22412);
assert.equal(gaps["CODEX:02"].sha256, "30365a8d5bf7b7e6a1f6ec0b710d6e566d37d696cc1b700ede69d020a05ef1e9");
assert.equal(gaps["CODEX:02"].new_subject_app, false);
assert.equal(gaps["CODEX:03"].bytes, 32775);
assert.equal(gaps["CODEX:03"].sha256, "47dee98f61008ee1c054fb6055717f1e15346e30b039f7e0080e3d54ffe3daef");
assert.equal(gaps["CODEX:03"].new_subject_app, false);

assert.equal(codex.summary.primary_drive_design_folder_count, 20);
assert.equal(codex.summary.normalized_primary_family_count, 18);

for (const [job, review] of Object.entries(current.product_jobs)) {
  assert.equal(review.ground_up_new_native, false, `${job} cannot authorize broad ground-up native work`);
}

for (const guard of ["SOURCE:56!=LINEAGE:56", "SOURCE:57!=LINEAGE:57", "SOURCE:58!=LINEAGE:58", "CODEX:13!=CODEX_WORK:13"]) {
  assert.ok(current.guards.includes(guard));
}

assert.ok(current.closed_stale.includes("Five-Source assembly incomplete"));
console.log("master-design-current-ledger contract: PASS");
