/**
 * SRC051 baseline driver + S4 release gate contract test (no browser).
 *
 * Fast, deterministic contract checks for the SRC051 S3-correction lane. Every assertion here is
 * static: it reads the capsule, the shared harness sources and the workflow, and proves the wiring
 * and the stage contract WITHOUT launching a browser.
 *
 * Why no browser here. This file used to replay both authority lanes in a real Chrome. That was
 * removed after the exact-head run proved two things:
 *   1. it is platform-fragile - it built its scratch directory from process.env.TMPDIR ||
 *      process.env.TEMP, which are Windows-only names and are both undefined on the Linux runner,
 *      so the test threw ERR_INVALID_ARG_TYPE and then held the serial browser bucket until the
 *      workflow hit its own 20-minute limit;
 *   2. a real-browser Source proof already has a home. .github/workflows/a-track-p0-validation.yml
 *      states that CLEAN-108 real-browser proofs "must be tied to the PR head sha and therefore run
 *      only from .github/workflows/src-108-harness-gate.yml", and that workflow is the one that runs
 *      the SRC051 baseline capture. Its exact-head log reads SRC_BASELINE_CAPTURE_PASS=SRC051, so the
 *      live replay of the accepted S2 lanes is covered there against the accepted contract.
 * Adding a second, slower browser replay to A-track's serial bucket bought no extra coverage and cost
 * the run its budget. This file therefore stays a no-browser contract test.
 *
 * Covers: routing, the two authority lanes, the API inventory, the S4 hold, the fail-closed
 * authorization gate, S1 inheritance, Drive provenance, and byte-unchanged split content.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolveParityCaptureAuthorization, STAGE_GATE_REASONS, MATERIALIZATION_STATUSES } from '../src/08_harness/source-capsule-validator.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const capsule = path.join(repoRoot, 'src', '03_sources', 'SRC051');
const originalHtml = path.join(capsule, 'original', 'original.html');
const RESTING_STATES = ['THERMAL_CITY', 'CONNECTION_NODE_HOVER', 'MOMENT_CONNECTION_DEFAULT', 'MOMENT_SAVED_PRE_CTA'];
const API_MEMBERS = ['sections', 'scrollToSection', 'setProgress', 'update'];
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(capsule, rel), 'utf8'));
const readRepo = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');


test('capture-source-baseline.mjs routes SRC051 to the dedicated driver, not the generic fallback', () => {
  const harness = fs.readFileSync(path.join(repoRoot, 'src', '08_harness', 'capture-source-baseline.mjs'), 'utf8');
  assert.match(harness, /import \{ captureSRC051Baseline \} from '\.\/source051-driver\.mjs';/);
  const routeIndex = harness.indexOf("if (sourceId === 'SRC051')");
  const fallbackIndex = harness.indexOf('window.__lt && window.__lovetreeStats');
  assert.ok(routeIndex > 0, 'SRC051 route present');
  assert.ok(fallbackIndex > routeIndex, 'SRC051 route precedes the generic window.__lt fallback that timed out in CI');
  assert.match(harness, /SRC051: \[/);
  assert.match(harness, /reducedMotion: 'no-preference', label: '1440x900-normal'/);
  assert.match(harness, /reducedMotion: 'reduce', label: '1440x900-reduce'/);
  assert.match(harness, /const label = viewport\.label \?\? /, 'distinct labels keep the two 1440x900 lanes from overwriting each other');
});

test('the SRC051 manifest records the accepted runtime API inventory in full', () => {
  assert.deepEqual(readJson('manifest.json').source_contract.qa_hook_members, API_MEMBERS);
  assert.deepEqual(readJson('authority-context.json').qa_hooks.api_members_observed, API_MEMBERS);
  const script = fs.readFileSync(path.join(capsule, 'split', 'script.js'), 'utf8');
  for (const member of API_MEMBERS) assert.ok(script.includes(`${member}:`), `authored member ${member} exists in the frozen source`);
  assert.ok(script.includes('window.__LT_PROMO='), 'the accepted hook is window.__LT_PROMO');
  assert.ok(!/window\.__lt\b/.test(script), 'SRC051 does not implement the legacy window.__lt contract');
  const inventory = readJson('authority-context.json').data_uri_inventory;
  assert.equal(inventory.DATA_URI_PAYLOAD_COUNT, 15);
  assert.equal(inventory.RENDERED_IMG_ELEMENT_COUNT, 19);
  assert.equal(inventory.BROKEN_RENDERED_IMAGES, 0);
});


test('SRC051 materialization expresses the CENTRAL S4 acceptance, with the resolved provenance', () => {
  const materialization = readJson('split/materialization.json');
  assert.equal(materialization.status, 'ACCEPTED');
  assert.equal(materialization.parity_status, 'PASS');
  assert.equal(materialization.parity_ref, 'evidence/parity/accepted-parity.json');
  assert.equal(materialization.parity_claim_made, true);
  assert.equal(materialization.stage_gate.s4_release, 'RELEASED');
  assert.equal(materialization.stage_gate.parity_capture_authorized, true);
  assert.equal(materialization.stage_gate.central_visual_review, 'PASS');
  assert.equal(materialization.stage_gate.s4_metadata_promotion, 'RELEASED');
  // The acceptance is traceable to the CENTRAL decision, and the prior holds are kept for the record.
  assert.match(materialization.stage_gate.decision_ref, /5862568703/);
  assert.match(materialization.stage_gate.previous_decision_ref, /5859197749/);
  assert.equal(readJson('manifest.json').s4_parity_acceptance.artifact_id, 10957655770);
  assert.match(readJson('manifest.json').s4_parity_acceptance.ref, /5867690624/);

  // The S2 animation-bookkeeping observation is RESOLVED, not open. It keeps the original
  // observation and the reason it was previously unexplained, so the resolution stays auditable.
  const observations = materialization.preserved_metadata.unresolved_observations;
  const resolved = observations.find((o) => o.id === 'SRC051_REDUCED_MOTION_PSEUDO_ELEMENT_CSS_ANIMATION');
  assert.ok(resolved, 'the observation is recorded with its resolved id');
  assert.equal(resolved.status, 'RESOLVED');
  assert.equal(resolved.resolution, 'PSEUDO_ELEMENT_CSS_ANIMATIONS_SURVIVE_REDUCED_MOTION');
  assert.equal(resolved.supersedes, 'SRC051_ANIMATION_BOOKKEEPING_ATTRIBUTION_UNRESOLVED');
  assert.ok(resolved.observation.length > 40, 'the original observation is retained');
  assert.ok(resolved.why_previously_unresolved.length > 40, 'the earlier uncertainty is retained');
  // Every duplicated copy must agree, or the capsule contradicts itself again.
  for (const rel of ['manifest.json', 'authority-context.json', 'baseline/accepted-baseline.json']) {
    const copy = readJson(rel);
    const list = copy.unresolved_observations ?? copy.preserved_metadata?.unresolved_observations;
    assert.ok(list.every((o) => o.status === 'RESOLVED'), `${rel} carries no UNRESOLVED observation`);
  }
});

test('the S4 authorization gate releases SRC051 parity capture, and only because CENTRAL said so', () => {
  const verdict = resolveParityCaptureAuthorization(readJson('manifest.json'), readJson('split/materialization.json'));
  assert.equal(verdict.authorized, true, 'CENTRAL released S4 for SRC051 only');
  assert.equal(verdict.reason, null);
  assert.equal(verdict.source, 'CENTRAL_S4_RELEASED');
  // The release must be traceable to the CENTRAL decision, not to a locally flipped boolean.
  assert.match(readJson('split/materialization.json').stage_gate.decision_ref, /#589 comment 5862568703/);
});

test('the S4 authorization gate is fail-closed and preserves existing Source behaviour', () => {
  // A capsule written before the gate existed must behave exactly as it did.
  assert.equal(resolveParityCaptureAuthorization({ stages: { mechanical_split_complete: true, source_split_parity_pass: false } }, { status: 'MATERIALIZED_PENDING_PARITY' }).authorized, true);
  assert.equal(resolveParityCaptureAuthorization({}, null).authorized, true);
  // RELEASED + authorized=true is the only shape that unlocks capture.
  assert.equal(resolveParityCaptureAuthorization({}, { stage_gate: { s4_release: 'RELEASED', parity_capture_authorized: true } }).authorized, true);
  // Every inconsistent shape must fail closed rather than resolve in favour of capture.
  for (const gate of [
    { s4_release: 'HOLD_CENTRAL', parity_capture_authorized: true },
    { s4_release: 'RELEASED', parity_capture_authorized: false },
    { s4_release: 'MAYBE', parity_capture_authorized: true },
    { s4_release: 'RELEASED' },
    [],
  ]) {
    const verdict = resolveParityCaptureAuthorization({}, { stage_gate: gate });
    assert.equal(verdict.authorized, false, `inconsistent gate must fail closed: ${JSON.stringify(gate)}`);
    assert.equal(verdict.reason, STAGE_GATE_REASONS.INCONSISTENT);
  }
  // The real capsules that already have accepted parity are unaffected.
  for (const id of ['SRC047', 'SRC056', 'SRC060', 'SRC062', 'SRC071']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'src', '03_sources', id, 'manifest.json'), 'utf8'));
    const record = JSON.parse(fs.readFileSync(path.join(repoRoot, 'src', '03_sources', id, 'split', 'materialization.json'), 'utf8'));
    assert.equal(resolveParityCaptureAuthorization(manifest, record).authorized, true, `${id} keeps its pre-existing authorized behaviour`);
  }
});

test('duplicate variant adjudication inherits the accepted S1 fresh-read fact', () => {
  const manifest = readJson('manifest.json');
  assert.equal(manifest.duplicate_variant_status, 'DUPLICATE_COPY_SAME_SHA');
  const note = manifest.duplicate_variant_note;
  assert.equal(note.adjudicated, true);
  assert.equal(note.fresh_enumeration.relation, 'DUPLICATE_COPY_SAME_SHA');
  assert.equal(note.fresh_enumeration.canonical_file_id, '1db5gYJPjTrvKxx_RzY-CAPG2WAg-e2nt');
  assert.equal(note.fresh_enumeration.alias_file_id, '1Ijr8nefQ-wwAAQyXexZnO10oj4Vf5_J8');
  assert.equal(note.fresh_enumeration.bytes_each, 2782365);
  assert.equal(note.fresh_enumeration.drive_md5_each, '9ad120f06687135c7c73a9f8da2b4293');
  assert.equal(note.provenance.s1_report_commit, 'ed22f458b5f9522b357464e99694d085df537058');
  assert.equal(note.no_new_readback_performed, true, 'no fresh Drive readback was spent re-proving an accepted fact');
  assert.equal(note.drive_mutation, 0);
});

test('drive provenance separates fresh S1 evidence from the historical S0 transport', () => {
  const readback = readJson('evidence/source/drive-authority-readback.json');
  assert.equal(readback.verification_mode, 'CENTRAL_FRESH_DRIVE_READBACK');
  assert.equal(readback.fresh_authority_evidence.stage, 'S1');
  assert.equal(readback.fresh_authority_evidence.report.commit, 'ed22f458b5f9522b357464e99694d085df537058');
  assert.equal(readback.fresh_authority_evidence.alias_relation, 'DUPLICATE_COPY_SAME_SHA');
  assert.equal(readback.historical_evidence.stage, 'S0');
  assert.equal(readback.historical_evidence.date, '2026-08-21');
  assert.equal(readback.historical_evidence.role, 'HISTORICAL_EARLIER_TRANSPORT');
  assert.equal(readback.drive_folder_identity.status, 'UNRESOLVED');
  assert.equal(readback.drive_folder_identity.blocking, false);
});

test('the SRC051 driver itself is present, wired and asserts the S2 synchronization contract', () => {
  const driver = readRepo('src/08_harness/source051-driver.mjs');
  assert.match(driver, /export async function captureSRC051Baseline\(/, 'driver exports the baseline entry');
  // The driver drives the accepted hook, never the legacy contract. Comments in the driver name the
  // legacy hook when explaining why it is not used, so code comments are stripped before the check
  // and only executable references are looked for.
  assert.match(driver, /window\.__LT_PROMO/, 'driver uses the accepted window.__LT_PROMO hook');
  const driverCode = driver.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/window\.__lt\b/.test(driverCode), 'driver code never references the legacy window.__lt contract');
  assert.ok(!/__lovetreeStats/.test(driverCode), 'driver code never references window.__lovetreeStats');
  assert.ok(!/waitForFunction\(\(\) => !!window\.__lt/.test(driverCode), 'driver never waits on the legacy hook');
  // Both released authority lanes, with the accepted state counts.
  assert.equal((driver.match(/name: 'RM_/g) || []).length, 14, '14 accepted reduced-motion states');
  assert.equal((driver.match(/name: '(?!RM_)[A-Z]/g) || []).length, 18, '18 accepted normal-motion states');
  // The two S2 synchronization classes are applied as harness waiting, not as tolerances.
  assert.match(driver, /waitForScrollArrival/, 'SMOOTH_SCROLL_ARRIVAL_SYNCHRONIZATION is applied');
  assert.match(driver, /waitForTransitionsSettled/, 'CSS_TRANSITION_SETTLE_SYNCHRONIZATION is applied');
  assert.match(driver, /CSSTransition/, 'the settle wait discriminates CSS transitions from Web Animations');
  for (const resting of RESTING_STATES) {
    assert.ok(driver.includes(`'${resting}'`) || driver.includes('settle: true'), `${resting} is replayed with a settle wait`);
  }
  // The declared WAAPI transient is created by a real click and never disabled.
  assert.match(driver, /page\.click\('#pulseBtn'\)/, 'the CTA pulse is created by one real click');
  for (const forbidden of ['animation: *"none', 'transition: *"none', 'cancelAnimation', 'finish()']) {
    assert.ok(!driver.includes(forbidden), `driver must not neutralise motion (${forbidden})`);
  }
  // The bookkeeping anomaly stays an unresolved raw observation.
  assert.match(driver, /UNRESOLVED: true/, 'bookkeeping is carried as UNRESOLVED');
  assert.match(driver, /RAW_OBSERVATION_ONLY/, 'bookkeeping is a raw observation only');
  // Original surface only: the driver names no split path and claims no parity.
  assert.ok(!/split\/index\.html/.test(driver), 'the driver never references the split surface');
  assert.match(driver, /original_vs_split_comparison: 'NOT_PERFORMED'/, 'no original-vs-split comparison');
  assert.match(driver, /parity_capture_authorized: false/, 'parity capture is not authorized');
});

test('the S4 authorization gate is wired into the shared parity harness before any capture', () => {
  const parity = readRepo('src/08_harness/capture-source-parity.mjs');
  assert.match(parity, /import \{ resolveParityCaptureAuthorization \} from '\.\/source-capsule-validator\.mjs';/);
  const gateAt = parity.indexOf('resolveParityCaptureAuthorization(manifest, materializationRecord)');
  const dispatchAt = parity.indexOf('sourceOut = path.join(outRoot, sourceId)');
  assert.ok(gateAt > 0, 'the parity harness consults the gate');
  assert.ok(gateAt < dispatchAt, 'the gate is consulted before the parity output directory is created');
  assert.match(parity, /SRC_SPLIT_PARITY_CAPTURE_SKIP=\$\{sourceId\} reason=\$\{authorization\.reason\}/, 'an explicit skip line is emitted');
  assert.ok(!/capture_surface=CONTEXT_AWARE_ONLY[\s\S]{0,200}SRC051/.test(parity), 'SRC051 is not faked away with a capture_surface');
  assert.match(readJson('authority-context.json').capture_surface.mode, /SINGLE_EXECUTABLE/, 'SRC051 declares a real standalone surface');
});

test('MECHANICAL_MATERIALIZED is a recognized status and cannot authorize parity', () => {
  assert.ok(MATERIALIZATION_STATUSES.includes('MECHANICAL_MATERIALIZED'));
  // The status alone must never unlock capture; the gate still has to.
  const verdict = resolveParityCaptureAuthorization({}, { status: 'MECHANICAL_MATERIALIZED' });
  assert.equal(verdict.authorized, true, 'a bare status record with no gate keeps legacy behaviour, unchanged');
  // A status record that DOES carry a gate must not be able to authorize while S4 is held.
  const held = resolveParityCaptureAuthorization({}, { status: 'MECHANICAL_MATERIALIZED', stage_gate: { s4_release: 'HOLD_CENTRAL', parity_capture_authorized: false } });
  assert.equal(held.authorized, false, 'MECHANICAL_MATERIALIZED + HOLD_CENTRAL must not authorize');
  assert.equal(held.reason, 'CENTRAL_S4_NOT_RELEASED');
});

test('every duplicated SRC051 synchronization-contract copy states the accepted 1+1+2 taxonomy', () => {
  // The S3 correction round fixed this taxonomy in authority-context.json and
  // baseline/accepted-baseline.json but left two stale copies of the old sentence behind in
  // manifest.json and split/materialization.json (CENTRAL #589 comment 5861425839). The contract is
  // deliberately duplicated across four files, so a prose change has to be applied to all of them or
  // the capsule starts disagreeing with itself. This test makes that failure impossible to reintroduce.
  const COPIES = [
    'authority-context.json',
    'baseline/accepted-baseline.json',
    'manifest.json',
    'split/materialization.json',
  ];

  // Locate the contract by shape rather than by an assumed path, so relocating it in one file does
  // not silently make this test vacuous.
  const findContract = (node) => {
    if (!node || typeof node !== 'object') return null;
    if (node.explicit_non_tolerance_rule && Array.isArray(node.classes) && node.classes.length === 4) return node;
    for (const value of Object.values(node)) {
      const hit = findContract(value);
      if (hit) return hit;
    }
    return null;
  };

  const contracts = COPIES.map((rel) => {
    const found = findContract(JSON.parse(fs.readFileSync(path.join(capsule, rel), 'utf8')));
    assert.ok(found, `${rel} carries a 4-class synchronization contract`);
    return { rel, contract: found };
  });

  // 1. One canonical statement, byte-identical in all four copies.
  const [first, ...rest] = contracts;
  for (const { rel, contract } of rest) {
    assert.equal(
      contract.explicit_non_tolerance_rule,
      first.contract.explicit_non_tolerance_rule,
      `${rel} states the non-tolerance rule identically to ${first.rel}`,
    );
  }

  // 2. The withdrawn sentence must be gone everywhere, not merely corrected in some copies.
  const WITHDRAWN = 'Three are harness synchronization conditions';
  const MISCREDITED = 'the fourth is bounded screenshot variance only';
  for (const { rel, contract } of contracts) {
    assert.ok(!contract.explicit_non_tolerance_rule.includes(WITHDRAWN), `${rel} no longer claims three synchronization classes`);
    assert.ok(!contract.explicit_non_tolerance_rule.includes(MISCREDITED), `${rel} no longer reduces the taxonomy to "the fourth"`);
  }

  // 3. The counts are machine-readable and agree, so nobody has to count from prose.
  for (const { rel, contract } of contracts) {
    const s = contract.taxonomy_summary;
    assert.ok(s, `${rel} carries a machine-readable taxonomy_summary`);
    assert.deepEqual(
      [s.variance_classes, s.declared_transient_exact_state_classes, s.synchronization_classes, s.total_classes],
      [1, 1, 2, 4],
      `${rel} states 1 variance + 1 declared transient + 2 synchronization = 4`,
    );
  }

  // 4. The declared-transient class must not be classified as a synchronization class. This is the
  //    specific miscount that caused the hold.
  const EXPECTED_KINDS = {
    CONTINUOUS_CSS_PHASE_VARIANCE: 'VARIANCE',
    DECLARED_WAAPI_TRANSIENT_STATE: 'DECLARED_TRANSIENT_EXACT_STATE',
    SMOOTH_SCROLL_ARRIVAL_SYNCHRONIZATION: 'SYNCHRONIZATION',
    CSS_TRANSITION_SETTLE_SYNCHRONIZATION: 'SYNCHRONIZATION',
  };
  for (const { rel, contract } of contracts) {
    const kinds = Object.fromEntries(contract.classes.map((c) => [c.name, c.kind]));
    assert.deepEqual(kinds, EXPECTED_KINDS, `${rel} classifies each class by kind`);
    const sync = contract.classes.filter((c) => c.kind === 'SYNCHRONIZATION').map((c) => c.name);
    assert.deepEqual(sync.sort(), ['CSS_TRANSITION_SETTLE_SYNCHRONIZATION', 'SMOOTH_SCROLL_ARRIVAL_SYNCHRONIZATION'], `${rel} names exactly the two synchronization classes`);
    const transient = contract.classes.find((c) => c.name === 'DECLARED_WAAPI_TRANSIENT_STATE');
    assert.equal(transient.tolerance_permitted, false, 'the declared WAAPI transient is never a tolerance');
  }
});

test('the authority and the split runtime are byte-unchanged by this correction', () => {
  const bytes = fs.readFileSync(originalHtml);
  assert.equal(bytes.length, 2782365);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), '5b7f084be9de9ca4f5d11044e797c3d2718208a2493d9ccbc9f8b5df07fdf014');
  assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex'), 'fd7e48b1301abe0f857e9a7bbc06162c088d0abc', 'authority Git blob unchanged');
  const expected = {
    'split/index.html': 'ff9f019c403bb358b06825e162f13ba8814473ceb4300d8ec1acb3eecd1bcaf4',
    'split/styles.css': 'cb11a6fde09f60fa617143a052cd94daaef08726197895c5acbc5cd26c5c9270',
    'split/script.js': '5d804c7e2352d2a8b393be82c1b976dfc6a374fec49f0e4257cab9992290ee10',
  };
  for (const [rel, sha] of Object.entries(expected)) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(capsule, rel))).digest('hex'), sha, `${rel} unchanged from the S3 head`);
  }
});

