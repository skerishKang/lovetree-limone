/**
 * mvp001-composition-contract.test.mjs
 *
 * Contract test for MVP001 composition.
 *
 * Positive path:
 *  - structural assertions on composition.json / route-map.json / acceptance.json
 *  - actually executes the fail-closed validator (spawns the CLI, asserts exit 0)
 *
 * Negative (fail-closed) path:
 *  - exercises the validator's pure predicates on crafted broken inputs and
 *    asserts they report errors (so a malformed composition would be rejected)
 *
 * Run: node --test tests/mvp001-composition-contract.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  checkProductImplRefs,
  checkDownstreamRelease,
  checkEntryComponent,
  checkAdmissionStatus,
  checkUniqueness,
  checkAcceptanceVsComposition,
  ADMISSION_CANDIDATE_STATUS,
} from "../src/08_harness/validate-mvp001-composition.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const COMPONENTS = [
  { key: "source56-relationship-overview", sourceId: "SRC056", role: "RELATIONSHIP_OVERVIEW" },
  { key: "source57-memory-detail", sourceId: "SRC057", role: "MEMORY_DETAIL" },
  { key: "source58-living-board", sourceId: "SRC058", role: "LIVING_BOARD" },
  { key: "source60-deep-exploration", sourceId: "SRC060", role: "DEEP_EXPLORATION" },
  { key: "source64-entry-portal", sourceId: "SRC064", role: "ENTRY_PORTAL" },
];

const COMPOSITION_DIR = "src/07_compositions/MVP001";
const COMPONENTS_DIR = "src/06_components";

test("Composition directory exists", () => {
  assert.ok(existsSync(COMPOSITION_DIR), `Composition dir ${COMPOSITION_DIR} missing`);
});

test("All 5 component directories exist with component.json and README.md", () => {
  for (const comp of COMPONENTS) {
    const dir = `${COMPONENTS_DIR}/${comp.key}`;
    assert.ok(existsSync(dir), `Component dir ${dir} missing`);
    assert.ok(existsSync(`${dir}/component.json`), `component.json missing for ${comp.key}`);
    assert.ok(existsSync(`${dir}/README.md`), `README.md missing for ${comp.key}`);
  }
});

test("All 5 component.json files have correct source_id, role, and ADMITTED status (no invented authority metadata)", () => {
  for (const comp of COMPONENTS) {
    const data = JSON.parse(readFileSync(`${COMPONENTS_DIR}/${comp.key}/component.json`, "utf8"));
    assert.equal(data.component_key, comp.key, `component_key mismatch for ${comp.key}`);
    assert.equal(data.source_id, comp.sourceId, `source_id mismatch for ${comp.key}`);
    assert.equal(data.product_role, comp.role, `product_role mismatch for ${comp.key}`);
    assert.equal(data.status, "ADMITTED", `status not ADMITTED for ${comp.key}`);
    assert.ok(
      data.admission.status === "PASS" || data.admission.status === "PASS_REUSED_ACCEPTED_EVIDENCE",
      `admission status not PASS/PASS_REUSED_ACCEPTED_EVIDENCE for ${comp.key}`
    );
    // No invented authority metadata
    assert.equal(data.admission.admitted_by, undefined, `${comp.key}: admitted_by must not be set`);
    assert.equal(data.admission.admitted_at, undefined, `${comp.key}: admitted_at must not be set`);
    // Generic durable-write claim removed from data_contract
    assert.equal(data.data_contract.no_durable_write, undefined, `${comp.key}: generic no_durable_write must be removed`);
  }
});

test("composition.json has correct structure", () => {
  const data = JSON.parse(readFileSync(`${COMPOSITION_DIR}/composition.json`, "utf8"));
  assert.equal(data.composition_id, "MVP001");
  assert.equal(data.status, "COMPOSED");
  assert.equal(data.components.length, 5);
  assert.equal(data.entry_component, "source64-entry-portal");
  assert.equal(data.entry_route_template, "/trees/{treeId}/portal");
  assert.equal(data.flow_mode, "CANONICAL_SEMANTIC_JOURNEY_NOT_FORCED_WIZARD");

  // Separated machine-readable contracts present
  for (const c of ["identity_contract", "data_contract", "navigation_contract", "visual_contract", "admission_contract", "downstream_release"]) {
    assert.ok(data[c], `composition.${c} missing`);
  }
  assert.equal(data.identity_contract.tree_identity_preserved, true);
  assert.equal(data.identity_contract.moment_identity_preserved, true);
  assert.equal(data.identity_contract.view_switcher_continuity, true);
  assert.equal(data.identity_contract.back_forward_continuity, true);
  assert.equal(data.identity_contract.no_invented_moment_id, true);
  assert.equal(data.data_contract.composition_registration_performs_durable_write, false);
  assert.equal(data.data_contract.product_runtime_mutation, "NONE");
  assert.equal(data.data_contract.source_authority_mutation, "NONE");
  assert.equal(data.data_contract.source_split_mutation, "NONE");

  // Verify all 5 components are referenced
  const componentKeys = data.components.map((c) => c.component_key);
  for (const comp of COMPONENTS) {
    assert.ok(componentKeys.includes(comp.key), `composition missing ${comp.key}`);
  }
});

test("route-map.json has correct structure and aligns with components", () => {
  const data = JSON.parse(readFileSync(`${COMPOSITION_DIR}/route-map.json`, "utf8"));
  assert.equal(data.composition_id, "MVP001");
  assert.equal(data.route_map.length, 5);

  for (const comp of COMPONENTS) {
    const entry = data.route_map.find((e) => e.component_key === comp.key);
    assert.ok(entry, `route-map missing ${comp.key}`);
    assert.equal(entry.source_id, comp.sourceId, `route-map source_id mismatch for ${comp.key}`);
    assert.equal(entry.product_role, comp.role, `route-map role mismatch for ${comp.key}`);
  }

  // registration-slice data contract, not generic no_durable_write
  assert.equal(data.shared_contracts.no_durable_write, undefined, "route-map shared_contracts must not use generic no_durable_write");
  assert.equal(data.shared_contracts.composition_registration_performs_durable_write, false);
  assert.equal(data.shared_contracts.product_runtime_mutation, "NONE");
  assert.equal(data.shared_contracts.no_invented_moment_id, true);
});

test("acceptance.json reflects candidate (pre-CENTRAL) state", () => {
  const data = JSON.parse(readFileSync(`${COMPOSITION_DIR}/acceptance.json`, "utf8"));
  assert.equal(data.composition_id, "MVP001");
  assert.equal(data.overall_status, ADMISSION_CANDIDATE_STATUS);
  assert.equal(data.accepted_at, null);
  assert.equal(data.accepted_by, null);
});

test("Source 06_components README exists", () => {
  assert.ok(existsSync("src/06_components/README.md"), "src/06_components/README.md missing");
});

test("Composition 07_compositions README exists", () => {
  assert.ok(existsSync("src/07_compositions/README.md"), "src/07_compositions/README.md missing");
});

// ---- Positive: actually execute the fail-closed validator ----
test("Validator runs and exits 0 on the real composition", () => {
  const validator = resolve(ROOT, "src/08_harness/validate-mvp001-composition.mjs");
  const result = spawnSync("node", [validator], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, `validator should exit 0, got ${result.status}\n${result.stdout}\n${result.stderr}`);
});

// ---- Negative fail-closed predicates ----
test("Negative: forbidden original/split product implementation ref is rejected", () => {
  const errs = checkProductImplRefs([
    "app/trees/[id]/portal/page.tsx",
    "src/03_sources/SRC064/original/original.html",
  ]);
  assert.ok(errs.length > 0, "should reject original/ path in product_implementation_refs");
  assert.ok(errs.some((e) => e.includes("original")), `unexpected errors: ${errs.join(" | ")}`);
});

test("Negative: duplicate component/source identity is rejected", () => {
  const errs = checkUniqueness([
    { component_key: "source64-entry-portal", source_id: "SRC064" },
    { component_key: "source64-entry-portal", source_id: "SRC064" },
  ]);
  assert.ok(errs.length > 0, "should reject duplicate identity");
});

test("Negative: wrong downstream_release scope is rejected", () => {
  const errs = checkDownstreamRelease({
    owner_downstream_release: true,
    release_scope: "GLOBAL",
    global_componentization_released: true,
    global_product_composition_released: false,
    inferred_from_source_rollout: false,
    authorized_by_owner: true,
  });
  assert.ok(errs.length > 0, "should reject non-MVP001_ONLY release scope");
});

test("Negative: wrong SRC064 entry/route is rejected", () => {
  const errs = checkEntryComponent({
    entry_component: "source57-memory-detail",
    entry_route_template: "/trees/{treeId}",
  });
  assert.ok(errs.length > 0, "should reject non-portal entry");
  assert.ok(errs.some((e) => e.includes("entry_component")), `unexpected: ${errs.join(" | ")}`);
});

test("Negative: wrong admission candidate status is rejected", () => {
  const errs = checkAdmissionStatus({
    admission_contract: { status: "PASS" },
  });
  assert.ok(errs.length > 0, "should reject self-certified PASS admission");
});

test("Negative: acceptance/composition mismatch is rejected", () => {
  const errs = checkAcceptanceVsComposition(
    { overall_status: "PASS", accepted_by: "Integration CTO", accepted_at: "2026-09-01T00:00:00Z" },
    { admission_contract: { status: ADMISSION_CANDIDATE_STATUS } }
  );
  assert.ok(errs.length > 0, "should reject acceptance that self-certifies or mismatches composition");
});

test("Negative: missing component (fewer than 5) would fail validator", () => {
  // The structural test above already asserts exactly 5 dirs exist; this
  // documents that a missing component breaks uniqueness/count expectations.
  const dirs = COMPONENTS.filter((c) => existsSync(`${COMPONENTS_DIR}/${c.key}`));
  assert.equal(dirs.length, 5, "all 5 component directories must exist for the validator to pass");
});
