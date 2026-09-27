/**
 * SRC051 baseline driver + S4 release gate contract test (local + CI).
 *
 * Verifies the dedicated SRC051 route in isolation, without running the whole shared baseline
 * harness. Covers routing, both authority lanes, the API inventory, the S4 hold, the fail-closed
 * authorization gate, S1 inheritance, Drive provenance and byte-unchanged split content, then
 * exercises the live driver against original/original.html.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { captureSRC051Baseline } from '../src/08_harness/source051-driver.mjs';
import { resolveParityCaptureAuthorization, STAGE_GATE_REASONS } from '../src/08_harness/source-capsule-validator.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const capsule = path.join(repoRoot, 'src', '03_sources', 'SRC051');
const originalHtml = path.join(capsule, 'original', 'original.html');
const RESTING_STATES = ['THERMAL_CITY', 'CONNECTION_NODE_HOVER', 'MOMENT_CONNECTION_DEFAULT', 'MOMENT_SAVED_PRE_CTA'];
const API_MEMBERS = ['sections', 'scrollToSection', 'setProgress', 'update'];
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(capsule, rel), 'utf8'));

function startServer() {
  const server = http.createServer((request, response) => {
    if (request.url === '/' || request.url === '/original.html') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      fs.createReadStream(originalHtml).pipe(response);
      return;
    }
    response.writeHead(404);
    response.end('nf');
  });
  return new Promise((resolve) => { server.listen(0, '127.0.0.1', () => resolve(server)); });
}

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { chromium = null; }

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


test('SRC051 materialization expresses a CENTRAL S4 hold, and no parity artifact exists', () => {
  const materialization = readJson('split/materialization.json');
  assert.equal(materialization.status, 'MECHANICAL_MATERIALIZED');
  assert.equal(materialization.parity_status, 'CENTRAL_S4_RELEASE_PENDING');
  assert.equal(materialization.stage_gate.s4_release, 'HOLD_CENTRAL');
  assert.equal(materialization.stage_gate.parity_capture_authorized, false);
  assert.equal(materialization.stage_gate.skip_reason, 'CENTRAL_S4_NOT_RELEASED');
  assert.equal(materialization.parity_ref, null);
  assert.equal(materialization.parity_claim_made, false);
  assert.equal(materialization.s4_started, false);
  assert.equal(fs.existsSync(path.join(capsule, 'evidence', 'parity')), false, 'no evidence/parity artifact while S4 is held');
});

test('the S4 authorization gate withholds SRC051 parity capture for the right reason', () => {
  const verdict = resolveParityCaptureAuthorization(readJson('manifest.json'), readJson('split/materialization.json'));
  assert.equal(verdict.authorized, false, 'source_split_parity_pass=false alone must NOT authorize parity capture');
  assert.equal(verdict.reason, STAGE_GATE_REASONS.S4_HOLD);
  assert.equal(verdict.reason, 'CENTRAL_S4_NOT_RELEASED');
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

const browserTest = chromium ? test : test.skip;
browserTest('SRC051 original baseline replay: both authority lanes, synchronization applied, no parity', async (t) => {
  const server = await startServer();
  const { port } = server.address();
  const channel = process.env.SRC_BROWSER_CHANNEL || null;
  const browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
  const outRoot = fs.mkdtempSync(path.join(process.env.TMPDIR || process.env.TEMP, 'src051-baseline-'));
  t.after(() => fs.rmSync(outRoot, { recursive: true, force: true }));
  try {
    for (const lane of [{ reducedMotion: 'no-preference', expectedStates: 18 }, { reducedMotion: 'reduce', expectedStates: 14 }]) {
      const outDir = path.join(outRoot, lane.reducedMotion);
      fs.mkdirSync(outDir, { recursive: true });
      const evidence = await captureSRC051Baseline(
        browser, `http://127.0.0.1:${port}/original.html`,
        { width: 1440, height: 900, dpr: 1, reducedMotion: lane.reducedMotion },
        outDir, `1440x900-${lane.reducedMotion === 'reduce' ? 'reduce' : 'normal'}`,
      );
      const names = Object.keys(evidence.states);
      assert.equal(names.length, lane.expectedStates, `${lane.reducedMotion}: ${lane.expectedStates} accepted states`);
      assert.deepEqual(evidence.errors, [], `${lane.reducedMotion}: no browser errors`);
      assert.deepEqual(evidence.failedRequests, [], `${lane.reducedMotion}: no failed requests`);

      // the accepted hook, not the legacy one
      assert.deepEqual(evidence.states[names[0]].state.api_members_present, { sections: true, scrollToSection: true, setProgress: true, update: true });
      // smooth-scroll arrival: geometry read only after the authored scroll landed
      for (const name of names) {
        const y = evidence.states[name].state.scroll.y;
        assert.ok(Number.isInteger(y) && y >= 0, `${name}: settled integer scroll y (${y})`);
      }
      // resting states waited out their transitions
      for (const resting of names.filter((n) => RESTING_STATES.includes(n))) {
        assert.equal(evidence.states[resting].css_transition_settle_applied, true, `${resting}: CSS_TRANSITION_SETTLE_SYNCHRONIZATION applied`);
      }
      // FROZEN DEFECT D5 preserved: the WAAPI pulse is live, 700/900ms, still not gated
      assert.equal(evidence.interaction.waapi_pulse_preserved_not_disabled, true);
      assert.ok(evidence.interaction.waapi_pulse.after_click_count > 0, 'the authored WAAPI pulse is live after one real click');
      assert.deepEqual(evidence.interaction.waapi_pulse.after_click.map((a) => a.duration_ms).sort((a, b) => a - b), [700, 900], 'authored pulse durations preserved verbatim');
      assert.equal(evidence.interaction.waapi_pulse.gated_on_prefers_reduced_motion, false);
      // bookkeeping anomaly stays an unresolved raw observation
      assert.equal(evidence.states[names[0]].state.animation_bookkeeping.UNRESOLVED, true);
      assert.equal(evidence.states[names[0]].state.animation_bookkeeping.disposition, 'RAW_OBSERVATION_ONLY');
      // original surface only; no parity anywhere
      assert.equal(evidence.interaction.original_surface_only, true);
      assert.equal(evidence.interaction.original_vs_split_comparison, 'NOT_PERFORMED');
      assert.equal(evidence.interaction.parity_capture_authorized, false);
      assert.equal(evidence.interaction.central_s4_release, 'HOLD_CENTRAL');
      assert.equal(evidence.interaction.smooth_scroll_arrival_synchronization, 'APPLIED');
      assert.equal(evidence.interaction.css_transition_settle_synchronization, 'APPLIED_TO_RESTING_STATES');
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

