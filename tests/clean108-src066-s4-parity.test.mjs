/**
 * CLEAN-108 SRC066 S4 SOURCE_PORT_PARITY contract (browserless, fail-closed).
 *
 * Binds the S4 candidate to its evidence without executing a browser:
 *  - T1 no premature promotion: the manifest parity flag is still false, no
 *       parity_ref exists, and no accepted-parity artifact was created.
 *  - T2 the S3 gate fields are intact; the notes now describe the released,
 *       captured-but-unaccepted S4 candidate instead of the old S4 HOLD.
 *  - T3 the BOUNDED_SKIP is released in the shared parity harness by routing
 *       SRC066 to its existing S2 driver against both surfaces, at the S2
 *       viewports, with no new harness or driver.
 *  - T4 the candidate summary is bound to an exact 40-hex capture head that the
 *       harness output itself carries.
 *  - T5 every matched state and the interaction record are recorded EQUAL on the
 *       three viewports, with zero browser errors and zero failed requests on
 *       both surfaces, and the captured state sets match the S2 recipe.
 *  - T6 the screenshot accounting is internally consistent: exactly one of the
 *       18 pairs is not byte-identical, it is named and quantified, and the
 *       pixel-level accounting agrees with the summary.
 *  - T7 the canonical 16x16 pixel digest is byte-identical for all 18 pairs.
 *  - T8 every recorded screenshot digest is produced by a committed PNG.
 *  - T9 the frozen authority and the split outputs are unchanged.
 *  - T10 zero QA hooks: the driver, the SRC066 parity block and the three split
 *        outputs read no window.__* contract, and all twelve frozen defects are
 *        still recorded as preserved.
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const REPO = path.join(import.meta.dirname, '..');
const SRC = 'src/03_sources/SRC066';
const S4 = `${SRC}/evidence/s4`;
const PARITY_HARNESS = 'src/08_harness/capture-source-parity.mjs';
const DRIVER = 'src/08_harness/source066-driver.mjs';
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(REPO, rel), 'utf8'));
const readTxt = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
const viewports = ['1440x900', '430x932', '390x844'];

test('T1 no premature promotion: parity flag false, no ref, no accepted artifact', () => {
  const manifest = readJson(`${SRC}/manifest.json`);
  assert.equal(manifest.source_id, 'SRC066');
  assert.equal(manifest.stages.source_split_parity_pass, false, 'manifest parity flag must stay false until CENTRAL acceptance');
  assert.equal(manifest.parity_ref, undefined, 'no parity_ref before acceptance');
  assert.ok(!fs.existsSync(path.join(REPO, SRC, 'evidence', 'parity', 'accepted-parity.json')), 'no accepted-parity artifact created');
  assert.match(manifest.stages_note, /not yet accepted/, 'stages_note explains the pending acceptance');
});

test('T2 S3 gate fields intact; notes describe the released S4 candidate', () => {
  const mat = readJson(`${SRC}/split/materialization.json`);
  assert.equal(mat.status, 'MATERIALIZED_PENDING_PARITY');
  assert.equal(mat.parity_status, 'PENDING_EXACT_HEAD_CAPTURE');
  assert.equal(mat.next_stage, 'S4_HOLD');
  assert.match(mat.status_note, /CANDIDATE|candidate/);
  assert.doesNotMatch(mat.status_note, /not released for this lane/, 'the old S4-HOLD wording must be gone');
  assert.doesNotMatch(mat.parity_status_note, /was not executed/, 'the old "not executed" wording must be gone');
  assert.match(mat.parity_status_note, /288f355a9ab47b2ba94a2416a5876e54e46f2753/, 'parity note binds the capture head');
  assert.equal(mat.source_candidate.branch, 'clean/src066-s3-mechanical-port');
});

test('T3 BOUNDED_SKIP released: SRC066 parity route reuses the S2 driver and S2 viewports', () => {
  const harness = readTxt(PARITY_HARNESS);
  assert.equal(harness.match(/S4_PARITY_NOT_CLAIMED/g)?.length ?? 0, 0, 'the not-claimed SKIP is removed');
  const start = harness.indexOf("if (sourceId === 'SRC066') {");
  assert.ok(start >= 0, 'SRC066 parity dispatch site exists');
  let depth = 0;
  let end = -1;
  for (let i = start; i < harness.length; i += 1) {
    if (harness[i] === '{') depth += 1;
    if (harness[i] === '}') {
      depth -= 1;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  const block = harness.slice(start, end);
  assert.ok(block.includes('captureSRC66Baseline'), 'uses the bounded S2 driver');
  assert.ok(block.includes('${sourceId}/original.html'), 'replays the original surface');
  assert.ok(block.includes('${sourceId}/split/index.html'), 'replays the split surface');
  assert.ok(!/captureVariant\(/.test(block), 'does not fall through to the generic hook path');
  assert.ok(!/window\.__[A-Za-z0-9_]/.test(block), 'reads no window.__* hooks');
  assert.ok(block.includes('captured state set drift') && block.includes('state drift') && block.includes('interaction drift'));

  const vAt = harness.indexOf('SRC066: [');
  assert.ok(vAt >= 0, 'SRC066 viewport entry exists');
  const win = harness.slice(vAt, vAt + 300);
  for (const [w, h] of [[1440, 900], [430, 932], [390, 844]]) {
    assert.ok(win.includes(`width: ${w},`) && win.includes(`height: ${h}`), `SRC066 parity viewport ${w}x${h} present`);
  }
  assert.equal(harness.match(/SRC066: \[/g)?.length ?? 0, 1, 'exactly one SRC066 viewport entry');
  assert.match(readTxt(DRIVER), /captureSRC66Baseline/);
  assert.ok(!/window\.__[A-Za-z0-9_]/.test(readTxt(DRIVER)), 'driver reads zero window.__* hooks');
});

test('T4 candidate summary is bound to an exact capture head the harness carries', () => {
  const summary = readJson(`${S4}/summary.json`);
  assert.equal(summary.source_id, 'SRC066');
  assert.equal(summary.status, 'CANDIDATE_PASS_CENTRAL_PENDING');
  assert.equal(summary.parity_result, 'CANDIDATE_PASS');
  assert.equal(summary.source_split_parity_pass, false);
  assert.equal(summary.central_visual_acceptance, 'PENDING');
  assert.match(summary.capture_head_sha, /^[0-9a-f]{40}$/, 'capture head is an exact 40-hex SHA');
  assert.equal(readJson(`${S4}/harness-summary.json`).exact_head, summary.capture_head_sha, 'harness output carries the same head');
  assert.match(summary.base_sha, /^[0-9a-f]{40}$/);
  assert.notEqual(summary.capture_head_sha, summary.base_sha);
});

test('T5 every matched state and the interaction record are EQUAL on both surfaces', () => {
  const summary = readJson(`${S4}/summary.json`);
  for (const vp of viewports) {
    const rec = readJson(`${S4}/${vp}.json`);
    const states = Object.keys(rec.original.states);
    assert.deepEqual([...states].sort(), [...summary.states_per_viewport[vp]].sort(), `${vp}: captured states match the S2 recipe`);
    assert.deepEqual([...Object.keys(rec.split.states)].sort(), [...states].sort(), `${vp}: split captured the same state set`);
    for (const state of states) {
      assert.equal(rec.comparison[`${state.toLowerCase()}_state_equal`], true, `${vp} ${state}: state equality recorded`);
      assert.deepStrictEqual(rec.split.states[state].state, rec.original.states[state].state, `${vp} ${state}: recorded states agree`);
    }
    assert.equal(rec.comparison.interaction_equal, true, `${vp}: interaction equality recorded`);
    assert.deepStrictEqual(rec.split.interaction, rec.original.interaction, `${vp}: recorded interactions agree`);
    for (const side of ['original', 'split']) {
      assert.equal(rec[side].errors.length, 0, `${vp} ${side}: zero browser errors`);
      assert.equal(rec[side].failedRequests.length, 0, `${vp} ${side}: zero failed requests`);
    }
    assert.equal(summary.console_errors + summary.page_errors + summary.failed_requests + summary.external_requests, 0);
  }
  for (const dim of ['dom_parity', 'geometry_parity', 'computed_style_parity', 'runtime_state_parity', 'interaction_parity', 'state_set_parity']) {
    assert.equal(summary[dim], 'EQUAL');
  }
  assert.equal(summary.pair_count, 18);
});

test('T6 exactly one screenshot pair is not byte-identical, named and quantified', () => {
  const summary = readJson(`${S4}/summary.json`);
  let unequal = [];
  for (const vp of viewports) {
    const rec = readJson(`${S4}/${vp}.json`);
    for (const state of Object.keys(rec.original.states)) {
      const key = `${state.toLowerCase()}_screenshot_sha_equal`;
      if (rec.comparison[key] !== true) unequal.push({ viewport: vp, state });
    }
  }
  assert.equal(unequal.length, 1, 'exactly one pair is not byte-identical');
  assert.deepEqual(unequal[0], { viewport: '1440x900', state: 'FOOTER_REACHED' });
  assert.equal(summary.screenshots.byte_identical_pairs + summary.screenshots.non_identical_pairs, 18);
  assert.equal(summary.screenshots.non_identical.length, 1);
  const entry = summary.screenshots.non_identical[0];
  assert.equal(entry.viewport, '1440x900');
  assert.equal(entry.state, 'FOOTER_REACHED');
  const rec = readJson(`${S4}/1440x900.json`);
  assert.equal(entry.original_sha256, rec.original.states.FOOTER_REACHED.screenshot_sha256);
  assert.equal(entry.split_sha256, rec.split.states.FOOTER_REACHED.screenshot_sha256);
  const pixel = readJson(`${S4}/pixel-diff.json`);
  assert.equal(pixel.pairs_with_differing_pixels, 1);
  const measured = pixel.pairs.find((p) => p.viewport === '1440x900' && p.state === 'FOOTER_REACHED');
  assert.ok(measured, 'the pair is measured in the pixel accounting');
  assert.equal(measured.differing_pixels, entry.visual_difference_result.differing_pixels);
  assert.equal(measured.max_channel_delta_0_255, entry.visual_difference_result.max_channel_delta_0_255);
  assert.equal(measured.differing_pixels, summary.screenshots.max_nonidentical_differing_pixels);
  assert.ok(measured.max_channel_delta_0_255 <= 1, 'antialiasing-scale delta only');
  assert.deepEqual(measured.diff_bbox, entry.visual_difference_result.diff_bbox);
  assert.match(entry.visual_difference_result.reviewer_assessment, /ANTIALIASING_NOISE_ONLY/);
  assert.match(entry.canonical_digest_result, /BYTE_IDENTICAL/);
});

test('T7 canonical 16x16 pixel digest is byte-identical for all 18 pairs', () => {
  const canonical = readJson(`${S4}/canonical-digest.json`);
  assert.equal(canonical.pair_count, 18);
  assert.equal(canonical.canonical_sha_equal_count, 18);
  assert.equal(canonical.max_canonical_hamming, 0);
  assert.equal(canonical.canonical_bytes, 1024);
  assert.ok(canonical.hamming_threshold >= canonical.max_canonical_hamming);
  for (const p of canonical.pairs) {
    assert.equal(p.canonical_sha_equal, true, `${p.viewport} ${p.state}: canonical digest equal`);
    assert.equal(p.canonical_hamming, 0);
  }
});

test('T8 every recorded screenshot digest is produced by a committed PNG', () => {
  for (const vp of viewports) {
    const rec = readJson(`${S4}/${vp}.json`);
    for (const side of ['original', 'split']) {
      for (const [state, recorded] of Object.entries(rec[side].states)) {
        const name = `${vp}-${side}-${state.toLowerCase().replace(/_/g, '-')}.png`;
        const file = path.join(REPO, S4, name);
        assert.ok(fs.existsSync(file), `${name} committed`);
        assert.equal(sha256(fs.readFileSync(file)), recorded.screenshot_sha256, `${name} digest matches its record`);
        assert.equal(fs.statSync(file).size, recorded.screenshot_bytes, `${name} byte count matches its record`);
      }
    }
  }
});

test('T9 frozen authority and split outputs are unchanged', () => {
  const manifest = readJson(`${SRC}/manifest.json`);
  const mat = readJson(`${SRC}/split/materialization.json`);
  const original = fs.readFileSync(path.join(REPO, SRC, 'original', 'original.html'));
  assert.equal(original.length, manifest.authority.bytes);
  assert.equal(sha256(original), manifest.authority.sha256);
  assert.equal(sha256(original), mat.authority.sha256);
  for (const [rel, expected] of Object.entries(mat.outputs)) {
    const bytes = fs.readFileSync(path.join(REPO, SRC, rel));
    assert.equal(bytes.length, expected.bytes, `${rel} byte count unchanged`);
    assert.equal(sha256(bytes), expected.sha256, `${rel} sha256 unchanged`);
  }
  assert.equal(mat.round_trip_evidence.byte_identical, true);
});

test('T10 zero QA hooks and twelve frozen defects still preserved', () => {
  for (const rel of ['split/index.html', 'split/styles.css', 'split/script.js']) {
    assert.ok(!/window\.__[A-Za-z0-9_]/.test(readTxt(`${SRC}/${rel}`)), `${rel} adds no window.__* hook`);
  }
  assert.ok(!/window\.__[A-Za-z0-9_]/.test(readTxt(DRIVER)), 'driver adds no window.__* hook');
  assert.equal(Object.values(readJson(`${SRC}/split/materialization.json`).frozen_defects_preserved)
    .filter((v) => typeof v === 'string' && v === 'PRESERVED_NOT_FIXED').length, 12, 'all twelve frozen defects remain preserved');
  const summary = readJson(`${S4}/summary.json`);
  assert.equal(summary.frozen_defects.qa_hooks_added, 0);
  assert.equal(summary.frozen_defects.source_bytes_changed, 0);
});
