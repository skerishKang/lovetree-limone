/**
 * validate-mvp001-composition.mjs
 *
 * Fail-closed validator for the MVP001 composition.
 *
 * When run as a CLI it validates the real repository tree and exits non-zero on
 * any contract violation. It is also importable: pure helper predicates are
 * exported so the contract test can assert fail-closed behaviour on crafted
 * (negative) inputs without touching the real tree.
 *
 * Checks performed:
 *  - exactly 5 component records under src/06_components
 *  - each component.json RECORD binds to canonical (source_id / product_role /
 *    canonical_route_template) and declares source_manifest_ref / source_parity_ref
 *    equal to the canonical src/03_sources/<id> paths (which exist & parity ACCEPTED)
 *  - component_key uniqueness and source_id uniqueness
 *  - each Source manifest (via the record's declared ref) exists and required
 *    mechanical stages are all true
 *  - each Source parity evidence (via the record's declared ref) exists and is ACCEPTED
 *  - every product_implementation_ref exists and never points into
 *    src/03_sources/<id>/original/... or src/03_sources/<id>/split/...
 *  - all composition component refs resolve and ALIGN with the actual records
 *  - entry component is source64-entry-portal at /trees/{treeId}/portal
 *  - flow refs resolve and begin/end at the entry component
 *  - route-map aligns with the actual component records (not just composition.components)
 *  - blocking_sources is empty
 *  - admission_contract.status = CANDIDATE_PASS_ALL_5_PENDING_CENTRAL_EXACT_HEAD_REVIEW
 *  - identity continuity contract booleans all true
 *  - downstream_release has the exact scoped values (MVP001_ONLY, no global release)
 *  - NO inference from global ROLLOUT (generation-state.json is never read)
 *  - real git diff scope check: no changed file under app/**, components/**,
 *    src/03_sources/** versus the base commit
 *
 * Usage:
 *   node src/08_harness/validate-mvp001-composition.mjs
 *   MVP001_VALIDATION_ROOT=/path node src/08_harness/validate-mvp001-composition.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const EXPECTED_SOURCES = ["SRC056", "SRC057", "SRC058", "SRC060", "SRC064"];
export const EXPECTED_ENTRY_COMPONENT = "source64-entry-portal";
export const EXPECTED_ENTRY_ROUTE = "/trees/{treeId}/portal";
export const ADMISSION_CANDIDATE_STATUS = "CANDIDATE_PASS_ALL_5_PENDING_CENTRAL_EXACT_HEAD_REVIEW";

/** Canonical expected per-component binding. Single source of truth. */
export const COMPONENT_MAP = [
  { id: "SRC056", key: "source56-relationship-overview", role: "RELATIONSHIP_OVERVIEW", canonical_route_template: "/trees/{treeId}/relationships" },
  { id: "SRC057", key: "source57-memory-detail", role: "MEMORY_DETAIL", canonical_route_template: "/trees/{treeId}" },
  { id: "SRC058", key: "source58-living-board", role: "LIVING_BOARD", canonical_route_template: "/trees/{treeId}/board" },
  { id: "SRC060", key: "source60-deep-exploration", role: "DEEP_EXPLORATION", canonical_route_template: "/trees/{treeId}/explore" },
  { id: "SRC064", key: "source64-entry-portal", role: "ENTRY_PORTAL", canonical_route_template: "/trees/{treeId}/portal" },
];

export const PROHIBITED_PRODUCT_IMPL_PREFIXES = ["src/03_sources/"];
export const FORBIDDEN_IMPL_SUBPATHS = ["/original/", "/split/"];

export const EXPECTED_DOWNSTREAM_RELEASE = {
  owner_downstream_release: true,
  release_scope: "MVP001_ONLY",
  global_componentization_released: false,
  global_product_composition_released: false,
  inferred_from_source_rollout: false,
  authorized_by_owner: true,
};

/** Pure: returns array of error strings for product_implementation_refs. */
export function checkProductImplRefs(refs) {
  const errors = [];
  if (!Array.isArray(refs)) {
    errors.push("product_implementation_refs must be an array");
    return errors;
  }
  for (const ref of refs) {
    if (typeof ref !== "string" || ref.length === 0) {
      errors.push(`empty/invalid product_implementation_ref`);
      continue;
    }
    for (const prefix of PROHIBITED_PRODUCT_IMPL_PREFIXES) {
      if (ref.startsWith(prefix)) {
        for (const sub of FORBIDDEN_IMPL_SUBPATHS) {
          if (ref.includes(sub)) {
            errors.push(`product_implementation_ref must not point into frozen source authority: ${ref}`);
          }
        }
      }
    }
  }
  return errors;
}

/** Pure: returns array of error strings for downstream_release. */
export function checkDownstreamRelease(dr) {
  const errors = [];
  if (!dr || typeof dr !== "object") {
    errors.push("downstream_release missing");
    return errors;
  }
  for (const [k, v] of Object.entries(EXPECTED_DOWNSTREAM_RELEASE)) {
    if (dr[k] !== v) {
      errors.push(`downstream_release.${k} must be ${JSON.stringify(v)}, got ${JSON.stringify(dr[k])}`);
    }
  }
  return errors;
}

/** Pure: returns array of error strings for the entry declaration. */
export function checkEntryComponent(composition) {
  const errors = [];
  if (!composition || typeof composition !== "object") {
    errors.push("composition missing");
    return errors;
  }
  if (composition.entry_component !== EXPECTED_ENTRY_COMPONENT) {
    errors.push(`entry_component must be ${EXPECTED_ENTRY_COMPONENT}, got ${composition.entry_component}`);
  }
  if (composition.entry_route_template !== EXPECTED_ENTRY_ROUTE) {
    errors.push(`entry_route_template must be ${EXPECTED_ENTRY_ROUTE}, got ${composition.entry_route_template}`);
  }
  return errors;
}

/** Pure: returns array of error strings for the admission candidate status. */
export function checkAdmissionStatus(composition) {
  const errors = [];
  const ac = composition && composition.admission_contract;
  if (!ac || ac.status !== ADMISSION_CANDIDATE_STATUS) {
    errors.push(`admission_contract.status must be ${ADMISSION_CANDIDATE_STATUS}`);
  }
  return errors;
}

/** Pure: returns array of error strings for duplicate identity. */
export function checkUniqueness(records) {
  const errors = [];
  const keys = new Set();
  const srcs = new Set();
  for (const r of records) {
    if (!r || !r.component_key) continue;
    if (keys.has(r.component_key)) errors.push(`duplicate component_key: ${r.component_key}`);
    else keys.add(r.component_key);
    if (srcs.has(r.source_id)) errors.push(`duplicate source_id: ${r.source_id}`);
    else srcs.add(r.source_id);
  }
  return errors;
}

/** Pure: returns array of error strings for acceptance vs composition mismatch. */
export function checkAcceptanceVsComposition(acceptance, composition) {
  const errors = [];
  const candidate = composition && composition.admission_contract && composition.admission_contract.status;
  if (!acceptance || acceptance.overall_status !== candidate) {
    errors.push(`acceptance.overall_status (${acceptance && acceptance.overall_status}) must equal admission_contract.status (${candidate})`);
  }
  if (acceptance && acceptance.accepted_by !== null) {
    errors.push("acceptance.accepted_by must be null before CENTRAL exact-head review");
  }
  if (acceptance && acceptance.accepted_at !== null) {
    errors.push("acceptance.accepted_at must be null before CENTRAL exact-head review");
  }
  return errors;
}

/**
 * Pure: validate a single component record against its canonical binding.
 * Checks source_id, product_role, canonical_route_template, and that the
 * declared source_manifest_ref / source_parity_ref equal the canonical paths.
 */
export function checkComponentRecordBinding(record, canonical) {
  const errors = [];
  if (!record || typeof record !== "object") { errors.push("component record missing"); return errors; }
  if (record.source_id !== canonical.id) {
    errors.push(`${record.component_key || "?"}: source_id must be ${canonical.id}, got ${record.source_id}`);
  }
  if (record.product_role !== canonical.role) {
    errors.push(`${record.component_key}: product_role must be ${canonical.role}, got ${record.product_role}`);
  }
  if (record.canonical_route_template !== canonical.canonical_route_template) {
    errors.push(`${record.component_key}: canonical_route_template must be ${canonical.canonical_route_template}, got ${record.canonical_route_template}`);
  }
  const expManifest = `src/03_sources/${canonical.id}/manifest.json`;
  const expParity = `src/03_sources/${canonical.id}/evidence/parity/accepted-parity.json`;
  if (record.source_manifest_ref !== expManifest) {
    errors.push(`${record.component_key}: source_manifest_ref must be ${expManifest}, got ${record.source_manifest_ref}`);
  }
  if (record.source_parity_ref !== expParity) {
    errors.push(`${record.component_key}: source_parity_ref must be ${expParity}, got ${record.source_parity_ref}`);
  }
  return errors;
}

/**
 * Filesystem-backed: load the 5 canonical component records from the tree.
 * Returns { records, errors } where errors covers missing dirs / unparseable
 * component.json. Missing records are reported as errors but not added.
 */
export function loadComponentRecords(root, canonicalMap = COMPONENT_MAP) {
  const records = [];
  const errors = [];
  for (const { id, key } of canonicalMap) {
    const cjPath = resolve(root, "src/06_components", key, "component.json");
    if (!existsSync(cjPath)) { errors.push(`Component directory/record missing: ${key}`); continue; }
    try {
      records.push(JSON.parse(readFileSync(cjPath, "utf8")));
    } catch (e) {
      errors.push(`parse error ${key}/component.json: ${e.message}`);
    }
  }
  return { records, errors };
}

/**
 * Pure: validate the full set of loaded records against the canonical map.
 * Checks exactly 5 present, each canonical key present (no missing), each
 * record binds correctly, and no unexpected/extra records exist.
 */
export function checkComponentRecordSet(records, canonicalMap = COMPONENT_MAP) {
  const errors = [];
  if (!Array.isArray(records) || records.length !== 5) {
    errors.push(`Expected exactly 5 component records, found ${Array.isArray(records) ? records.length : "none"}`);
  }
  const byKey = new Map(records.map((r) => [r.component_key, r]));
  const seen = new Set();
  for (const c of canonicalMap) {
    const rec = byKey.get(c.key);
    if (!rec) { errors.push(`missing required component record: ${c.key}`); continue; }
    seen.add(c.key);
    for (const e of checkComponentRecordBinding(rec, c)) errors.push(e);
  }
  for (const r of records) {
    if (!seen.has(r.component_key)) errors.push(`unexpected component record not in canonical map: ${r.component_key}`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Filesystem-backed validation (CLI path)
// ---------------------------------------------------------------------------

function readJson(root, rel) {
  const p = resolve(root, rel);
  if (!existsSync(p)) return { ok: false, error: `missing: ${rel}`, data: null };
  try {
    return { ok: true, error: null, data: JSON.parse(readFileSync(p, "utf8")) };
  } catch (e) {
    return { ok: false, error: `parse error ${rel}: ${e.message}`, data: null };
  }
}

function resolveBase(root) {
  if (process.env.MVP001_BASE_SHA) return process.env.MVP001_BASE_SHA;
  try {
    return execFileSync("git", ["merge-base", "origin/main", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "origin/main";
  }
}

function gitChangedFiles(root, base) {
  const out = execFileSync("git", ["diff", "--name-only", base, "HEAD"], { cwd: root, encoding: "utf8" });
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

const REQUIRED_STAGES = [
  "identity_verified",
  "raw_authority_locked",
  "baseline_captured",
  "mechanical_split_complete",
  "source_split_parity_pass",
];

/**
 * Runs the full fail-closed validation against the repository tree at `root`.
 * Returns { errors, warnings }.
 */
export function runValidation(root) {
  const errors = [];
  const warnings = [];
  const pass = (m) => console.log("  PASS:", m);
  const fail = (m) => { errors.push(m); console.error("  FAIL:", m); };
  const warn = (m) => { warnings.push(m); console.warn("  WARN:", m); };

  console.log("\n[1] Component directory integrity + load records");
  const { records, errors: loadErrors } = loadComponentRecords(root);
  for (const e of loadErrors) fail(e);

  for (const { key } of COMPONENT_MAP) {
    const dir = resolve(root, "src/06_components", key);
    if (!existsSync(dir)) { fail(`Component directory missing: ${key}`); continue; }
    pass(`component directory exists: ${key}`);
    if (!existsSync(resolve(dir, "README.md"))) fail(`README.md missing for ${key}`);
    else pass(`README.md exists for ${key}`);
  }

  if (records.length !== 5) fail(`Expected exactly 5 component records, found ${records.length}`);
  else pass("exactly 5 component records present");

  console.log("\n[1b] Component record canonical binding (source_id / product_role / canonical_route_template / declared refs)");
  const recByKey = new Map(records.map((r) => [r.component_key, r]));
  for (const c of COMPONENT_MAP) {
    const rec = recByKey.get(c.key);
    if (!rec) { fail(`missing required component record: ${c.key}`); continue; }
    const be = checkComponentRecordBinding(rec, c);
    for (const e of be) fail(e);
    if (be.length === 0) pass(`${c.key}: canonical binding OK (${c.id} / ${c.role} / ${c.canonical_route_template})`);
  }

  console.log("\n[2] Component record content + uniqueness");
  for (const r of records) {
    if (r.component_key && r.source_id) pass(`${r.component_key}: record loaded`);
    else fail(`record missing component_key/source_id`);
  }
  for (const e of checkUniqueness(records)) fail(e);
  if (records.length === 5) pass("component_key and source_id uniqueness OK");

  console.log("\n[3] Source authority + mechanical stage + parity (via declared refs)");
  for (const r of records) {
    const id = r.source_id;
    const manifest = readJson(root, r.source_manifest_ref);
    if (!manifest.ok) { fail(`${id}: source_manifest_ref (${r.source_manifest_ref}) not found: ${manifest.error}`); continue; }
    pass(`${id}: source_manifest_ref resolves: ${r.source_manifest_ref}`);
    const stages = manifest.data.stages || {};
    for (const s of REQUIRED_STAGES) {
      if (stages[s] !== true) fail(`${id}: mechanical stage ${s} must be true`);
    }
    if (REQUIRED_STAGES.every((s) => stages[s] === true)) pass(`${id}: all 5 mechanical stages PASS`);

    const parity = readJson(root, r.source_parity_ref);
    if (!parity.ok) { fail(`${id}: source_parity_ref (${r.source_parity_ref}) not found: ${parity.error}`); continue; }
    if (parity.data.status !== "ACCEPTED") fail(`${id}: parity evidence status must be ACCEPTED, got ${parity.data.status}`);
    else pass(`${id}: parity evidence ACCEPTED`);
  }

  console.log("\n[4] Product implementation refs (exist + not frozen source authority)");
  for (const r of records) {
    const refs = r.product_implementation_refs || [];
    for (const ref of refs) {
      const p = resolve(root, ref);
      if (!existsSync(p)) fail(`${r.component_key}: product_implementation_ref not found: ${ref}`);
      else pass(`${r.component_key}: impl ref exists: ${ref}`);
    }
    for (const e of checkProductImplRefs(refs)) fail(`${r.component_key}: ${e}`);
    if (refs.length > 0 && checkProductImplRefs(refs).length === 0) pass(`${r.component_key}: no forbidden original/split impl refs`);
  }

  console.log("\n[5] Composition.json structure");
  const comp = readJson(root, "src/07_compositions/MVP001/composition.json");
  if (!comp.ok) { fail(comp.error); }
  else {
    const c = comp.data;
    if (c.composition_id !== "MVP001") fail("composition_id should be MVP001");
    else pass("composition_id is MVP001");
    if (!Array.isArray(c.components) || c.components.length !== 5) fail("composition.components must have 5 entries");
    else pass("composition.components has 5 entries");
    if (c.status !== "COMPOSED") fail("composition.status should be COMPOSED");
    else pass("composition.status is COMPOSED");

    for (const e of checkEntryComponent(c)) fail(e);
    if (c.entry_component === EXPECTED_ENTRY_COMPONENT && c.entry_route_template === EXPECTED_ENTRY_ROUTE) {
      pass("entry is source64-entry-portal @ /trees/{treeId}/portal");
    }

    // admission candidate status
    for (const e of checkAdmissionStatus(c)) fail(e);
    if (c.admission_contract && c.admission_contract.status === ADMISSION_CANDIDATE_STATUS) {
      pass(`admission_contract.status = ${ADMISSION_CANDIDATE_STATUS}`);
    }

    // blocking_sources empty
    if (!Array.isArray(c.blocking_sources) || c.blocking_sources.length !== 0) fail("blocking_sources must be empty");
    else pass("blocking_sources is empty");

    // identity continuity contract
    const ic = c.identity_contract || {};
    const idKeys = ["tree_identity_preserved", "moment_identity_preserved", "view_switcher_continuity", "back_forward_continuity", "no_invented_moment_id"];
    let idOk = true;
    for (const k of idKeys) if (ic[k] !== true) { fail(`identity_contract.${k} must be true`); idOk = false; }
    if (idOk) pass("identity_contract continuity booleans all true");

    // downstream_release exact scoped values
    for (const e of checkDownstreamRelease(c.downstream_release)) fail(e);
    if (c.downstream_release && checkDownstreamRelease(c.downstream_release).length === 0) {
      pass("downstream_release exact scoped values OK (MVP001_ONLY, no global release)");
    }

    // flow refs resolve
    const compKeys = new Set(c.components.map((x) => x.component_key));
    if (Array.isArray(c.flow) && c.flow.length > 0) {
      let flowOk = true;
      if (c.flow[0].component_key !== EXPECTED_ENTRY_COMPONENT) { fail("flow must begin at source64-entry-portal"); flowOk = false; }
      if (c.flow[c.flow.length - 1].component_key !== EXPECTED_ENTRY_COMPONENT) { fail("flow must return to source64-entry-portal"); flowOk = false; }
      for (const step of c.flow) {
        if (!compKeys.has(step.component_key)) { fail(`flow step references unknown component: ${step.component_key}`); flowOk = false; }
      }
      if (flowOk) pass("flow refs resolve and begin/end at entry component");
    } else fail("flow missing or empty");

    // composition.json components must align with the actual loaded component records
    const compRecByKey = new Map(records.map((r) => [r.component_key, r]));
    let compAlignOk = true;
    for (const comp of c.components) {
      const rec = compRecByKey.get(comp.component_key);
      if (!rec) { fail(`composition component ${comp.component_key}: no matching component record`); compAlignOk = false; continue; }
      if (comp.source_id !== rec.source_id) { fail(`composition ${comp.component_key}: source_id mismatch (record=${rec.source_id})`); compAlignOk = false; }
      if (comp.product_role !== rec.product_role) { fail(`composition ${comp.component_key}: product_role mismatch (record=${rec.product_role})`); compAlignOk = false; }
      if (comp.canonical_route !== rec.canonical_route_template) { fail(`composition ${comp.component_key}: canonical_route mismatch (record=${rec.canonical_route_template})`); compAlignOk = false; }
    }
    if (compAlignOk) pass("composition.json components align with actual component records");
  }

  console.log("\n[6] route-map.json alignment against actual component records");
  const rm = readJson(root, "src/07_compositions/MVP001/route-map.json");
  if (!rm.ok) fail(rm.error);
  else {
    const map = rm.data;
    if (!Array.isArray(map.route_map) || map.route_map.length !== 5) fail("route_map must have 5 entries");
    else pass("route_map has 5 entries");
    const recByKey6 = new Map(records.map((r) => [r.component_key, r]));
    for (const entry of map.route_map) {
      const rec = recByKey6.get(entry.component_key);
      if (!rec) { fail(`route-map ${entry.component_key}: no matching component record`); continue; }
      if (entry.source_id !== rec.source_id) fail(`route-map ${entry.component_key}: source_id mismatch (record=${rec.source_id})`);
      if (entry.product_role !== rec.product_role) fail(`route-map ${entry.component_key}: product_role mismatch (record=${rec.product_role})`);
      if (entry.route !== rec.canonical_route_template) fail(`route-map ${entry.component_key}: route mismatch (expected record canonical_route_template=${rec.canonical_route_template})`);
    }
    if (map.route_map.length === 5 && map.route_map.every((e) => recByKey6.has(e.component_key))) {
      pass("route-map aligns with actual component records");
    }
  }

  console.log("\n[7] Acceptance vs composition");
  const acc = readJson(root, "src/07_compositions/MVP001/acceptance.json");
  if (!acc.ok) fail(acc.error);
  else {
    for (const e of checkAcceptanceVsComposition(acc.data, comp.data)) fail(e);
    if (acc.data.overall_status === ADMISSION_CANDIDATE_STATUS && acc.data.accepted_by === null && acc.data.accepted_at === null) {
      pass(`acceptance.overall_status = ${ADMISSION_CANDIDATE_STATUS}, accepted_by/at = null`);
    }
  }

  console.log("\n[8] Real git diff scope check (no product runtime / source authority mutation)");
  let base;
  try {
    base = resolveBase(root);
    pass(`diff base resolved: ${base}`);
  } catch (e) {
    fail(`cannot resolve git diff base: ${e.message}`);
    base = null;
  }
  if (base) {
    let changed = [];
    try {
      changed = gitChangedFiles(root, base);
    } catch (e) {
      fail(`git diff failed: ${e.message}`);
    }
    const prohibited = ["app/", "components/", "src/03_sources/"];
    const violations = changed.filter((f) => prohibited.some((p) => f.startsWith(p)));
    if (violations.length > 0) {
      for (const v of violations) fail(`MUTATION DETECTED under frozen path: ${v}`);
    } else {
      pass(`no changes under app/**, components/**, src/03_sources/** (${changed.length} changed file(s) in scope)`);
    }
    if (changed.length > 0) {
      console.log("  INFO changed files:");
      for (const f of changed) console.log("    -", f);
    }
  }

  console.log("\n========================================");
  console.log("MVP001 Composition Validation Complete");
  console.log(`Errors:   ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log("========================================");

  return { errors, warnings };
}

// CLI entrypoint
const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const root = process.env.MVP001_VALIDATION_ROOT
    ? resolve(process.env.MVP001_VALIDATION_ROOT)
    : resolve(__dirname, "../..");
  const { errors } = runValidation(root);
  if (errors.length > 0) {
    console.error("\nFAILED: Composition validation errors found.");
    process.exit(1);
  }
  console.log("\nPASSED: All composition validation checks passed.");
  process.exit(0);
}
