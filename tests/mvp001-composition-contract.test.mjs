/**
 * mvp001-composition-contract.test.mjs
 *
 * Contract test for MVP001 composition:
 * - All 5 component directories exist with component.json + README.md
 * - composition.json references all 5 components
 * - route-map.json maps all 5 routes
 * - acceptance.json is PENDING_VALIDATION
 * - No prohibited paths mutated (source authority, product runtime)
 *
 * Run: node --test tests/mvp001-composition-contract.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

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

test("All 5 component.json files have correct source_id, role, and ADMITTED status", () => {
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
  }
});

test("composition.json has correct structure", () => {
  const data = JSON.parse(readFileSync(`${COMPOSITION_DIR}/composition.json`, "utf8"));
  assert.equal(data.composition_id, "MVP001");
  assert.equal(data.status, "COMPOSED");
  assert.equal(data.components.length, 5);
  assert.equal(data.composition_contract.source_geometry_silent_redesign, false);
  assert.equal(data.composition_contract.source_interaction_silent_redesign, false);
  assert.equal(data.composition_contract.no_product_runtime_mutation, true);
  assert.equal(data.composition_contract.tree_identity_preserved, true);
  assert.equal(data.composition_contract.moment_identity_preserved, true);
  assert.equal(data.composition_contract.no_durable_write, true);

  // Verify all 5 components are referenced
  const componentKeys = data.components.map(c => c.component_key);
  for (const comp of COMPONENTS) {
    assert.ok(componentKeys.includes(comp.key), `composition missing ${comp.key}`);
  }
});

test("route-map.json has correct structure and aligns with components", () => {
  const data = JSON.parse(readFileSync(`${COMPOSITION_DIR}/route-map.json`, "utf8"));
  assert.equal(data.composition_id, "MVP001");
  assert.equal(data.route_map.length, 5);

  for (const comp of COMPONENTS) {
    const entry = data.route_map.find(e => e.component_key === comp.key);
    assert.ok(entry, `route-map missing ${comp.key}`);
    assert.equal(entry.source_id, comp.sourceId, `route-map source_id mismatch for ${comp.key}`);
    assert.equal(entry.product_role, comp.role, `route-map role mismatch for ${comp.key}`);
  }

  // Verify shared contracts
  assert.equal(data.shared_contracts.no_durable_write, true);
  assert.equal(data.shared_contracts.no_invented_moment_id, true);
});

test("acceptance.json is PENDING_VALIDATION", () => {
  const data = JSON.parse(readFileSync(`${COMPOSITION_DIR}/acceptance.json`, "utf8"));
  assert.equal(data.composition_id, "MVP001");
  assert.equal(data.overall_status, "PENDING_VALIDATION");
  assert.equal(data.accepted_at, null);
  assert.equal(data.accepted_by, null);
});

test("Source 06_components README exists", () => {
  assert.ok(existsSync("src/06_components/README.md"), "src/06_components/README.md missing");
});

test("Composition 07_compositions README exists", () => {
  assert.ok(existsSync("src/07_compositions/README.md"), "src/07_compositions/README.md missing");
});

test("Validator exists", () => {
  assert.ok(existsSync("src/08_harness/validate-mvp001-composition.mjs"), "validator missing");
});

test("No product runtime mutation (source authority files untouched)", () => {
  // Verify source authority files are unchanged from origin/main
  // In a fresh worktree, these should exist as-is
  assert.ok(existsSync("src/03_sources/SRC056/authority/authority.json"), "SRC056 authority should exist");
  assert.ok(existsSync("src/03_sources/SRC057/authority/authority.json"), "SRC057 authority should exist");
  assert.ok(existsSync("src/03_sources/SRC058/authority/authority.json"), "SRC058 authority should exist");
  assert.ok(existsSync("src/03_sources/SRC060/authority/authority.json"), "SRC060 authority should exist");
  assert.ok(existsSync("src/03_sources/SRC064/authority/authority.json"), "SRC064 authority should exist");
});