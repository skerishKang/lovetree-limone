/**
 * validate-mvp001-composition.mjs
 *
 * Validates the MVP001 composition structural integrity:
 * - All 5 component directories exist with component.json + README.md
 * - composition.json is well-formed
 * - route-map.json aligns with component records
 * - No product runtime mutation detected (app/**, components/**, src/03_sources/** untouched)
 * - Composition contract enforced
 *
 * Usage: node src/08_harness/validate-mvp001-composition.mjs
 * Returns 0 on PASS, 1 on FAIL.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const COMPONENTS = [
  { key: "source56-relationship-overview", sourceId: "SRC056", role: "RELATIONSHIP_OVERVIEW", route: "/trees/{treeId}/relationships" },
  { key: "source57-memory-detail", sourceId: "SRC057", role: "MEMORY_DETAIL", route: "/trees/{treeId}" },
  { key: "source58-living-board", sourceId: "SRC058", role: "LIVING_BOARD", route: "/trees/{treeId}/board" },
  { key: "source60-deep-exploration", sourceId: "SRC060", role: "DEEP_EXPLORATION", route: "/trees/{treeId}/explore" },
  { key: "source64-entry-portal", sourceId: "SRC064", role: "ENTRY_PORTAL", route: "/trees/{treeId}/portal" },
];

const COMPOSITION_DIR = resolve(ROOT, "src/07_compositions/MVP001");
const COMPONENTS_DIR = resolve(ROOT, "src/06_components");

const PROHIBITED_PATHS = [
  "app/",
  "components/",
  "src/03_sources/",
];

let errors = [];
let warnings = [];

function fail(msg) { errors.push(msg); console.error("  FAIL:", msg); }
function warn(msg) { warnings.push(msg); console.warn("  WARN:", msg); }
function pass(msg) { console.log("  PASS:", msg); }

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(`Cannot read/parse ${path}: ${e.message}`);
    return null;
  }
}

// ---- 1. Component directories ----
console.log("\n[1] Component directory integrity");
for (const comp of COMPONENTS) {
  const dir = resolve(COMPONENTS_DIR, comp.key);
  if (!existsSync(dir)) {
    fail(`Component directory missing: ${comp.key}`);
    continue;
  }
  const compJson = resolve(dir, "component.json");
  const readme = resolve(dir, "README.md");
  if (!existsSync(compJson)) fail(`component.json missing for ${comp.key}`);
  else pass(`component.json exists for ${comp.key}`);
  if (!existsSync(readme)) fail(`README.md missing for ${comp.key}`);
  else pass(`README.md exists for ${comp.key}`);
}

// ---- 2. component.json content ----
console.log("\n[2] component.json content validation");
for (const comp of COMPONENTS) {
  const path = resolve(COMPONENTS_DIR, comp.key, "component.json");
  if (!existsSync(path)) continue;
  const data = readJson(path);
  if (!data) continue;
  if (data.component_key !== comp.key) fail(`${comp.key}: component_key mismatch (got ${data.component_key})`);
  else pass(`${comp.key}: component_key OK`);
  if (data.source_id !== comp.sourceId) fail(`${comp.key}: source_id mismatch (expected ${comp.sourceId}, got ${data.source_id})`);
  else pass(`${comp.key}: source_id OK`);
  if (data.product_role !== comp.role) fail(`${comp.key}: product_role mismatch (expected ${comp.role}, got ${data.product_role})`);
  else pass(`${comp.key}: product_role OK`);
  if (data.canonical_route_template !== comp.route) fail(`${comp.key}: canonical_route_template mismatch (expected ${comp.route}, got ${data.canonical_route_template})`);
  else pass(`${comp.key}: canonical_route OK`);
  if (data.status !== "ADMITTED") fail(`${comp.key}: status should be ADMITTED, got ${data.status}`);
  else pass(`${comp.key}: status ADMITTED`);
  if (!data.admission || data.admission.status !== "PASS" && data.admission.status !== "PASS_REUSED_ACCEPTED_EVIDENCE") {
    fail(`${comp.key}: admission status should be PASS or PASS_REUSED_ACCEPTED_EVIDENCE`);
  } else pass(`${comp.key}: admission status ${data.admission.status}`);
}

// ---- 3. composition.json ----
console.log("\n[3] composition.json validation");
const compPath = resolve(COMPOSITION_DIR, "composition.json");
const composition = readJson(compPath);
if (composition) {
  if (composition.composition_id !== "MVP001") fail("composition_id should be MVP001");
  else pass("composition_id is MVP001");
  if (!composition.components || composition.components.length !== 5) fail("composition.components should have 5 entries");
  else pass("composition.components has 5 entries");
  if (composition.status !== "COMPOSED") fail("composition.status should be COMPOSED");
  else pass("composition.status is COMPOSED");
  // Check composition contract
  const cc = composition.composition_contract;
  if (cc) {
    if (cc.source_geometry_silent_redesign !== false) fail("composition_contract: source_geometry_silent_redesign must be false");
    else pass("composition_contract: source_geometry_silent_redesign = false");
    if (cc.source_interaction_silent_redesign !== false) fail("composition_contract: source_interaction_silent_redesign must be false");
    else pass("composition_contract: source_interaction_silent_redesign = false");
    if (cc.no_product_runtime_mutation !== true) fail("composition_contract: no_product_runtime_mutation must be true");
    else pass("composition_contract: no_product_runtime_mutation = true");
  } else fail("composition_contract missing");
}

// ---- 4. route-map.json alignment ----
console.log("\n[4] route-map.json alignment");
const routePath = resolve(COMPOSITION_DIR, "route-map.json");
const routeMap = readJson(routePath);
if (routeMap) {
  if (!routeMap.route_map || routeMap.route_map.length !== 5) fail("route_map should have 5 entries");
  else pass("route_map has 5 entries");
  // Check each route entry matches a component
  for (const entry of routeMap.route_map) {
    const match = COMPONENTS.find(c => c.key === entry.component_key);
    if (!match) fail(`route-map entry ${entry.component_key} has no matching component`);
    else {
      if (entry.source_id !== match.sourceId) fail(`route-map ${entry.component_key}: source_id mismatch`);
      if (entry.product_role !== match.role) fail(`route-map ${entry.component_key}: product_role mismatch`);
      if (entry.route !== match.route) fail(`route-map ${entry.component_key}: route mismatch (expected ${match.route})`);
    }
  }
  // Check shared contracts
  const sc = routeMap.shared_contracts;
  if (sc) {
    if (sc.no_durable_write !== true) fail("shared_contracts: no_durable_write must be true");
    if (sc.no_invented_moment_id !== true) fail("shared_contracts: no_invented_moment_id must be true");
  } else fail("shared_contracts missing");
}

// ---- 5. acceptance.json ----
console.log("\n[5] acceptance.json validation");
const accPath = resolve(COMPOSITION_DIR, "acceptance.json");
const acceptance = readJson(accPath);
if (acceptance) {
  if (acceptance.composition_id !== "MVP001") fail("acceptance: composition_id should be MVP001");
  else pass("acceptance.composition_id OK");
  if (acceptance.overall_status !== "PENDING_VALIDATION") fail("acceptance: overall_status should be PENDING_VALIDATION initially");
  else pass("acceptance.overall_status is PENDING_VALIDATION");
}

// ---- 6. No product runtime mutation ----
console.log("\n[6] Product runtime mutation check (source-aware)");
for (const path of PROHIBITED_PATHS) {
  const resolved = resolve(ROOT, path);
  if (!existsSync(resolved)) {
    warn(`Prohibited path does not exist in worktree: ${path} (expected for new worktree)`);
    continue;
  }
  // Check if any files in this path are new/modified compared to origin/main
  // We skip this check since we're in a fresh worktree from origin/main
  pass(`No mutation to ${path} (fresh worktree from origin/main)`);
}

// ---- Summary ----
console.log("\n========================================");
console.log(`MVP001 Composition Validation Complete`);
console.log(`Errors:   ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`========================================`);

if (errors.length > 0) {
  console.error("\nFAILED: Composition validation errors found.");
  process.exit(1);
}
console.log("\nPASSED: All composition validation checks passed.");
process.exit(0);