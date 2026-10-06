#!/usr/bin/env node
/**
 * generation-phase-guard.mjs
 *
 * Fail-closed guard for the current clean-generation mechanical source phase.
 * Enforces that active src/ contains no TS/TSX/JSX files, no component
 * directory under 06_components other than the exact generation-state released
 * pilot set (each corroborated by its adoption ledger record), no premature
 * MVP compositions beyond README.md, and no reintroduced clean-generation
 * MVP composition contract tests under tests/.
 *
 * Release authority for components comes ONLY from
 * src/01_registry/generation-state.json -> componentization. The adoption
 * ledger is corroborating evidence, never a release: a ledger record on its
 * own never permits a component directory (an orphan record for an unreleased
 * pilot is inert evidence, not authority).
 *
 * Accepted lifecycle (promoted by CENTRAL exact-head review, PR #675 comment
 * 6020686874, binding the ordering ADOPTION_CANDIDATE -> OWNER_RELEASED ->
 * REUSABLE_ADAPTER_BOUND): the guard pins the promoted truth and fails closed
 * on any deviation in either direction — broad_release=false,
 * released_pilots=["SRC064"], stage_by_id.SRC064=REUSABLE_ADAPTER_BOUND,
 * s5_accepted=true, reusable_adapter_bound=true, while
 * product_composition_released / product_adoption_complete must stay false.
 * Each released pilot's ledger record must carry
 * adoption_status=REUSABLE_ADAPTER_BOUND and the exact owner release
 * reference. Demoting back to a candidate state is a FAIL; over-claiming a
 * product composition release or product adoption completion is a FAIL.
 *
 * Exit 0 = PASS, Exit 1 = FAIL (any violation).
 *
 * Runtime: .mjs only — TS/TSX forbidden in current phase.
 */

import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';

const SRC_ROOT = join(import.meta.dirname, '..');
const ROOT = join(SRC_ROOT, '..');
const ADOPTION_LEDGER = join(ROOT, 'src/01_registry/adoptions');
const GENERATION_STATE = join(ROOT, 'src/01_registry/generation-state.json');

const FORBIDDEN_EXTENSIONS = new Set(['.ts', '.tsx', '.jsx']);

// Phase-pinned accepted lifecycle (promotion authority: PR #675 comment
// 6020686874). The guard fails closed on ANY deviation in either direction:
// demotion back to a candidate state is as much a FAIL as an over-claim.
const EXPECTED_STAGE = 'REUSABLE_ADAPTER_BOUND';
const EXPECTED_LEDGER_STATUS = 'REUSABLE_ADAPTER_BOUND';
const EXPECTED_PHASE_STATE = 'REUSABLE_ADAPTER_BOUND';
const OWNER_RELEASE_REF = 'PR #675 comment 6020686874';

let violations = [];

/**
 * Recursively collect all files under a directory.
 */
function walkDir(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    try {
      const st = statSync(full);
      if (st.isDirectory()) {
        walkDir(full, files);
      } else if (st.isFile()) {
        files.push(full);
      }
    } catch {
      // skip unreadable entries
    }
  }
  return files;
}

/**
 * Check 1: No .ts/.tsx/.jsx files anywhere in src/
 */
function checkNoTypeScriptInSrc() {
  const allFiles = walkDir(join(ROOT, 'src'));
  const tsFiles = allFiles.filter(f => FORBIDDEN_EXTENSIONS.has(extname(f).toLowerCase()));
  for (const f of tsFiles) {
    violations.push(`FORBIDDEN_EXT: ${relative(ROOT, f)} — .ts/.tsx/.jsx not allowed in src/ during current phase`);
  }
  if (tsFiles.length === 0) {
    console.log('PASS: No .ts/.tsx/.jsx files in src/');
  }
}

/**
 * Read the componentization release authority from generation-state.json.
 * Returns null on any structural problem (missing file, malformed JSON,
 * missing/invalid fields); callers must treat null as FAIL (fail-closed).
 *
 * Release authority model (S5 accepted lifecycle, PR #675 comment 6020686874):
 *   componentization.broad_release === false
 *   componentization.released_pilots = exact released pilot ID set
 *   componentization.stage_by_id[id]  = REUSABLE_ADAPTER_BOUND per pilot
 *   componentization.s5_accepted === true
 *   componentization.reusable_adapter_bound === true
 *   componentization.product_composition_released === false
 *   componentization.product_adoption_complete === false
 *   product_adoption.phase_state === REUSABLE_ADAPTER_BOUND (any stale,
 *   missing, null, or future-stage value fails closed)
 * The adoption ledger never releases anything on its own — it only
 * corroborates a pilot that generation-state already released, and at the
 * accepted stage it must record adoption_status=REUSABLE_ADAPTER_BOUND with
 * the exact owner release reference.
 */
function readReleaseAuthority() {
  let raw;
  try {
    raw = readFileSync(GENERATION_STATE, 'utf8');
  } catch {
    violations.push('GENERATION_STATE_UNREADABLE: src/01_registry/generation-state.json could not be read');
    return null;
  }
  let state;
  try {
    state = JSON.parse(raw);
  } catch (e) {
    violations.push(`GENERATION_STATE_MALFORMED: src/01_registry/generation-state.json is not valid JSON (${String((e && e.message) || e)})`);
    return null;
  }
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    violations.push('GENERATION_STATE_MALFORMED: generation-state root must be an object');
    return null;
  }
  const comp = state.componentization;
  if (!comp || typeof comp !== 'object' || Array.isArray(comp)) {
    violations.push('GENERATION_STATE_MALFORMED: componentization block missing or not an object');
    return null;
  }
  if (comp.broad_release !== false) {
    violations.push('BROAD_RELEASE_NOT_FALSE: componentization.broad_release must be exactly false (got ' + JSON.stringify(comp.broad_release) + ')');
    return null;
  }
  const pilots = comp.released_pilots;
  if (!Array.isArray(pilots) || pilots.length === 0
      || pilots.some((id) => typeof id !== 'string' || id.length === 0)
      || new Set(pilots).size !== pilots.length) {
    violations.push('RELEASED_PILOTS_INVALID: componentization.released_pilots must be a non-empty array of unique non-empty ID strings (got ' + JSON.stringify(pilots) + ')');
    return null;
  }
  const stages = comp.stage_by_id;
  if (!stages || typeof stages !== 'object' || Array.isArray(stages)) {
    violations.push('STAGE_BY_ID_INVALID: componentization.stage_by_id must be an object keyed by released pilot ID');
    return null;
  }
  for (const id of pilots) {
    const stage = stages[id];
    if (typeof stage !== 'string' || stage.length === 0) {
      violations.push(`STAGE_BY_ID_MISMATCH: componentization.stage_by_id.${id} must be a non-empty stage string for a released pilot`);
      return null;
    }
  }
  // Accepted-lifecycle invariants (promotion: PR #675 comment 6020686874).
  // The S5 candidate has been accepted and the reusable adapter is bound;
  // exactly that truth must be recorded. Demoting a flag back to false or
  // leaving a pilot in a candidate stage fails closed.
  if (comp.s5_accepted !== true) {
    violations.push(`S5_LIFECYCLE_MISMATCH: componentization.s5_accepted must be exactly true at the accepted stage (got ${JSON.stringify(comp.s5_accepted)})`);
    return null;
  }
  if (comp.reusable_adapter_bound !== true) {
    violations.push(`S5_LIFECYCLE_MISMATCH: componentization.reusable_adapter_bound must be exactly true at the accepted stage (got ${JSON.stringify(comp.reusable_adapter_bound)})`);
    return null;
  }
  for (const id of pilots) {
    if (stages[id] !== EXPECTED_STAGE) {
      violations.push(`STAGE_NOT_REUSABLE_ADAPTER_BOUND: componentization.stage_by_id.${id} must be exactly ${EXPECTED_STAGE} at the accepted stage (got ${JSON.stringify(stages[id])})`);
      return null;
    }
  }
  // S6 must not be claimed: product composition release / product adoption
  // completion remain separate unreleased states (both here and in the
  // product_adoption block, which must record the same truth).
  const pa = state.product_adoption;
  if (!pa || typeof pa !== 'object' || Array.isArray(pa)) {
    violations.push('PRODUCT_ADOPTION_MALFORMED: product_adoption block missing or not an object');
    return null;
  }
  // The product adoption phase state must record the promoted truth exactly.
  // Any other value — a stale candidate state, a missing/null value, or an
  // over-claim of a future stage — fails closed.
  if (pa.phase_state !== EXPECTED_PHASE_STATE) {
    violations.push(`PRODUCT_PHASE_STATE_MISMATCH: product_adoption.phase_state must be exactly ${EXPECTED_PHASE_STATE} at the accepted stage (got ${JSON.stringify(pa.phase_state)})`);
    return null;
  }
  for (const [label, obj] of [['componentization', comp], ['product_adoption', pa]]) {
    for (const key of ['product_composition_released', 'product_adoption_complete']) {
      if (obj[key] !== false) {
        violations.push(`PRODUCT_LIFECYCLE_CLAIM_FORBIDDEN: ${label}.${key} must be exactly false (got ${JSON.stringify(obj[key])})`);
        return null;
      }
    }
  }
  return { releasedPilots: pilots, stageById: stages };
}

/**
 * Corroborate one released pilot against the adoption ledger. The ledger
 * cannot release a pilot (generation-state already did), but a released pilot
 * whose ledger record is missing or fails to corroborate the accepted
 * lifecycle is a mismatch => FAIL. At the accepted stage the record must
 * carry adoption_status=REUSABLE_ADAPTER_BOUND bound to the exact owner
 * release reference.
 */
function ledgerMatchesPilot(pilotId) {
  const rec = join(ADOPTION_LEDGER, `${pilotId}.json`);
  if (!existsSync(rec)) return `released pilot ${pilotId} has no adoption ledger record (src/01_registry/adoptions/${pilotId}.json missing)`;
  let data;
  try {
    data = JSON.parse(readFileSync(rec, 'utf8'));
  } catch (e) {
    return `released pilot ${pilotId} adoption ledger record is not valid JSON (${String((e && e.message) || e)})`;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return `released pilot ${pilotId} adoption ledger record must be an object`;
  }
  if (data.identity !== 'LOVETREE_ADOPTION_RECORD') {
    return `released pilot ${pilotId} ledger identity mismatch (expected LOVETREE_ADOPTION_RECORD, got ${JSON.stringify(data.identity)})`;
  }
  if (data.source_or_codex_id !== pilotId) {
    return `released pilot ${pilotId} ledger source_or_codex_id mismatch (got ${JSON.stringify(data.source_or_codex_id)})`;
  }
  if (data.adoption_status !== EXPECTED_LEDGER_STATUS) {
    return `released pilot ${pilotId} ledger adoption_status mismatch (expected ${EXPECTED_LEDGER_STATUS}, got ${JSON.stringify(data.adoption_status)})`;
  }
  if (data.owner_release_ref !== OWNER_RELEASE_REF) {
    return `released pilot ${pilotId} ledger owner_release_ref mismatch (expected exactly ${JSON.stringify(OWNER_RELEASE_REF)}, got ${JSON.stringify(data.owner_release_ref)})`;
  }
  return null;
}

/**
 * Check 2: src/06_components/ — README.md always allowed; a component
 * directory is allowed ONLY when generation-state release authority says so:
 * broad_release=false, the directory name is in the exact released_pilots
 * set, and its adoption ledger record corroborates the promoted lifecycle
 * (adoption_status=REUSABLE_ADAPTER_BOUND + exact owner release reference).
 * Ledger self-registration alone never releases a component (fail-closed).
 */
function checkComponentsReadOnly() {
  // Release authority is always validated (malformed generation-state must
  // FAIL even when no component directory exists).
  const authority = readReleaseAuthority();
  const dir = join(ROOT, 'src/06_components');
  if (!existsSync(dir)) {
    if (authority) console.log('PASS: src/06_components/ does not exist');
    return;
  }
  const entries = readdirSync(dir, { withFileTypes: true });
  const componentDirs = [];
  for (const entry of entries) {
    if (entry.name === 'README.md') continue;
    if (entry.isDirectory()) {
      componentDirs.push(entry.name);
      continue;
    }
    violations.push(`FORBIDDEN_COMPONENT_ENTRY: src/06_components/${entry.name} — only README.md and released pilot directories are allowed`);
  }
  if (!authority) return; // release authority unreadable: already recorded as FAIL

  const releasedSet = new Set(authority.releasedPilots);

  // Exact set match: every component directory must be a released pilot…
  for (const name of componentDirs) {
    if (!releasedSet.has(name)) {
      violations.push(`UNRELEASED_COMPONENT: src/06_components/${name} — not in generation-state componentization.released_pilots (an adoption ledger record alone never releases a component)`);
    }
  }
  // …and every released pilot must exist with a corroborating ledger record
  // and its component directory (released pilot mismatch => FAIL).
  for (const pilotId of authority.releasedPilots) {
    const ledgerError = ledgerMatchesPilot(pilotId);
    if (ledgerError) {
      violations.push(`RELEASED_PILOT_LEDGER_MISMATCH: ${ledgerError}`);
    }
    if (!componentDirs.includes(pilotId)) {
      violations.push(`RELEASED_PILOT_COMPONENT_MISSING: src/06_components/${pilotId} — generation-state releases pilot ${pilotId} but no component directory exists`);
    }
  }

  const ok = componentDirs.length > 0
    && componentDirs.every((name) => releasedSet.has(name))
    && authority.releasedPilots.every((id) => componentDirs.includes(id) && !ledgerMatchesPilot(id));
  if (ok) {
    console.log(`PASS: src/06_components/ matches generation-state released pilots exactly (${authority.releasedPilots.join(', ')}) with corroborating adoption ledger records`);
  }
}

/**
 * Check 3: src/07_compositions/ — only README.md allowed
 */
function checkCompositionsReadOnly() {
  const dir = join(ROOT, 'src/07_compositions');
  if (!existsSync(dir)) {
    console.log('PASS: src/07_compositions/ does not exist');
    return;
  }
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry === 'README.md') continue;
    violations.push(`FORBIDDEN_COMPOSITION: src/07_compositions/${entry} — only README.md allowed in current phase`);
  }
  if (entries.every(e => e === 'README.md')) {
    console.log('PASS: src/07_compositions/ contains only README.md');
  }
}

/**
 * Check 4: No active MVP composition/validator artifacts under src/
 * Rejects files like validate-mvp*.mjs or MVP* directories.
 * Exception: this guard script itself.
 */
function checkNoMVPInSrc() {
  const allFiles = walkDir(join(ROOT, 'src'));
  const mvpFiles = allFiles.filter(f => {
    const rel = relative(ROOT, f);
    if (rel.startsWith('src/08_harness/generation-phase-guard')) return false;
    return /mvp\d/i.test(f);
  });
  for (const f of mvpFiles) {
    violations.push(`FORBIDDEN_MVP: ${relative(ROOT, f)} — MVP composition/validator not allowed in active src during current phase`);
  }
  if (mvpFiles.length === 0) {
    console.log('PASS: No MVP composition/validator files in active src');
  }
}

/**
 * Check 5: No reintroduced clean-generation MVP composition contract tests
 * Scoped specifically to mvpNNN-composition-contract.test.mjs patterns
 * (or equivalently named clean-generation MVP composition contract artifacts).
 */
function checkNoMVPCompositionTests() {
  const testsDir = join(ROOT, 'tests');
  if (!existsSync(testsDir)) {
    console.log('PASS: tests/ directory does not exist');
    return;
  }
  const allTestFiles = walkDir(testsDir);
  const forbidden = allTestFiles.filter(f => {
    const name = basename(f);
    // Match clean-generation MVP composition contract test pattern:
    // mvp001-composition-contract.test.mjs, mvpNNN-composition-contract.test.mjs, etc.
    return /^mvp\d+-composition-contract\.test\.mjs$/i.test(name);
  });
  for (const f of forbidden) {
    violations.push(`FORBIDDEN_TEST: ${relative(ROOT, f)} — clean-generation MVP composition contract test not allowed during current phase`);
  }
  if (forbidden.length === 0) {
    console.log('PASS: No clean-generation MVP composition contract tests in tests/');
  }
}

// --- Execute all checks ---
console.log('=== Generation Phase Guard (fail-closed) ===');
console.log(`SRC_ROOT: ${relative(ROOT, SRC_ROOT)}`);
console.log('');

checkNoTypeScriptInSrc();
checkComponentsReadOnly();
checkCompositionsReadOnly();
checkNoMVPInSrc();
checkNoMVPCompositionTests();

console.log('');
if (violations.length > 0) {
  console.log(`FAIL: ${violations.length} violation(s) detected:`);
  for (const v of violations) {
    console.log(`  - ${v}`);
  }
  console.log('');
  console.log('GENERATION_PHASE_GUARD = FAIL');
  process.exit(1);
} else {
  console.log('GENERATION_PHASE_GUARD = PASS');
  process.exit(0);
}
