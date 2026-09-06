/**
 * CLEAN-108 SRC066 S4 SOURCE_PORT_PARITY contract (browserless, fail-closed).
 *
 * Binds the S4 candidate to its evidence without executing a browser:
 *  - T1 promotion: the manifest parity flag is true, parity_ref resolves to an
 *       ACCEPTED record carrying the CENTRAL acceptance comment and the capture
 *       head, and the accepted record's tier counts and named differing pair
 *       agree with the committed candidate evidence.
 *  - T2 the materialization enum chain is promoted to ACCEPTED/PASS/ACCEPTED with
 *       parity_ref + parity_evidence bound to the capture head, and the notes
 *       describe the accepted state rather than the old S4 HOLD.
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
 *  - T10 the Drive handoff record (zip name, size and sha256, the 36-PNG
 *        inventory, the named non-identical pair) agrees with the committed
 *        evidence rather than being hand-written prose.
 *  - T11 zero QA hooks: the driver, the SRC066 parity block and the three split
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

test('T1 promotion: parity flag true, parity_ref resolves, accepted record agrees with the evidence', () => {
  const manifest = readJson(`${SRC}/manifest.json`);
  const accepted = readJson(`${SRC}/evidence/parity/accepted-parity.json`);
  const summary = readJson(`${S4}/summary.json`);
  assert.equal(manifest.source_id, 'SRC066');
  assert.equal(manifest.stages.source_split_parity_pass, true, 'CENTRAL accepted: manifest parity flag is true');
  assert.equal(manifest.parity_ref, 'evidence/parity/accepted-parity.json');
  assert.ok(fs.existsSync(path.join(REPO, SRC, manifest.parity_ref)), 'parity_ref resolves to a committed artifact');
  assert.match(manifest.stages_note, /5556645775/, 'stages_note cites the CENTRAL acceptance comment');
  assert.match(manifest.stages_note, /288f355a9ab47b2ba94a2416a5876e54e46f2753/, 'stages_note binds the capture head');

  assert.equal(accepted.source_id, 'SRC066');
  assert.equal(accepted.status, 'ACCEPTED');
  assert.equal(accepted.review_method, 'CENTRAL_DIRECT_DRIVE_S4_VISUAL_REVIEW');
  assert.equal(accepted.central_acceptance_comment, 5556645775);
  assert.equal(accepted.central_acceptance_issue, 'skerishKang/lovetree-limone#589');
  assert.match(accepted.source_head, /^[0-9a-f]{40}$/, 'accepted parity head is an exact 40-hex SHA');
  assert.equal(accepted.source_head, summary.capture_head_sha, 'accepted parity is bound to the captured head');
  assert.equal(accepted.provenance?.capture_base_sha, summary.base_sha, 'capture base SHA pinned');
  assert.deepEqual(accepted.provenance?.harness_release_commits, summary.harness_release_commits, 'both harness release commits pinned');
  assert.equal(accepted.authority.sha256, manifest.authority.sha256, 'authority SHA pinned');
  assert.equal(accepted.authority.bytes, manifest.authority.bytes, 'authority byte count pinned');
  assert.equal(accepted.authority.sha256, summary.authority.sha256, 'authority agrees with the capture evidence');
  assert.equal(accepted.visual_review?.central_direct_drive_s4_visual_review, true);
  assert.equal(accepted.visual_review?.central_direct_artifact_review, true, 'direct artifact review recorded');
  assert.equal(accepted.visual_review?.central_acceptance_comment, 5556645775);
  assert.equal(accepted.browser_errors, 0);
  assert.equal(accepted.console_errors + accepted.page_errors + accepted.required_network_errors + accepted.external_requests, 0);

  assert.equal(accepted.comparisons.dom, 'EQUAL');
  assert.equal(accepted.comparisons.geometry, 'EQUAL');
  assert.equal(accepted.comparisons.computed_style, 'EQUAL');
  assert.equal(accepted.comparisons.runtime_state, 'EQUAL');
  assert.equal(accepted.comparisons.interactions, 'EQUAL');
  assert.equal(accepted.comparisons.screenshots, 'BYTE_IDENTICAL_CANONICAL_PIXEL_DIGEST', 'aggregate tier matches the validator vocabulary');
  assert.deepEqual(
    accepted.comparisons,
    {
      dom: summary.dom_parity,
      geometry: summary.geometry_parity,
      computed_style: summary.computed_style_parity,
      runtime_state: summary.runtime_state_parity,
      interactions: summary.interaction_parity,
      state_set: summary.state_set_parity,
      screenshots: 'BYTE_IDENTICAL_CANONICAL_PIXEL_DIGEST',
    },
    'accepted comparisons agree with the captured evidence dimensions'
  );

  const policy = accepted.comparison_policy;
  assert.equal(policy.canonical16_used, true);
  assert.equal(policy.canonical16_scope, 'ALL_18_PAIRS');
  assert.equal(policy.canonical16_technique.buffer_bytes, 1024);
  assert.equal(policy.global_visual_tolerance, false);
  assert.equal(policy.screenshot_pixel_tolerance.startsWith('REMOVED'), true, 'no pixel tolerance decides equality');
  assert.deepEqual(policy.pair_tiers, { BYTE_IDENTICAL: 17, CANONICAL_PIXEL_DIGEST: 1, note: policy.pair_tiers.note }, '17 raw-identical + 1 canonical-digest pair');
  assert.equal(policy.pair_tiers.BYTE_IDENTICAL, summary.screenshots.byte_identical_pairs);
  assert.equal(policy.pair_tiers.CANONICAL_PIXEL_DIGEST, summary.screenshots.non_identical_pairs);
  assert.equal(policy.canonical16_result.pairs_identical, summary.screenshots.canonical_digest_pairs_identical);
  assert.equal(policy.canonical16_result.buffer_bytes, summary.screenshots.canonical_digest_bytes);
  assert.equal(policy.canonical16_result.max_hamming, summary.screenshots.canonical_digest_max_hamming);
  assert.equal(policy.canonical16_result.max_hamming, 0, 'canonical Hamming is 0: a digest identity, not a tolerance');
  assert.match(accepted.tier_authority, /5556645775/, 'tier decision cites the CENTRAL authority');

  const pair = policy.non_byte_identical_pair;
  const named = summary.screenshots.non_identical[0];
  assert.equal(pair.viewport, '1440x900');
  assert.equal(pair.state, 'FOOTER_REACHED');
  assert.equal(pair.tier, 'CANONICAL_PIXEL_DIGEST');
  assert.equal(pair.canonical_hamming, 0);
  assert.equal(pair.original_sha256, named.original_sha256, 'accepted record names the real original digest');
  assert.equal(pair.split_sha256, named.split_sha256, 'accepted record names the real split digest');
  assert.equal(pair.original_bytes, named.original_bytes);
  assert.equal(pair.split_bytes, named.split_bytes);
  assert.equal(pair.raw_difference.differing_pixels, named.visual_difference_result.differing_pixels);
  assert.equal(pair.raw_difference.differing_pixels, 14);
  assert.equal(pair.raw_difference.total_pixels, named.visual_difference_result.total_pixels);
  assert.equal(pair.raw_difference.max_channel_delta_0_255, named.visual_difference_result.max_channel_delta_0_255);
  assert.equal(pair.raw_difference.max_channel_delta_0_255, 1);
  assert.deepEqual(pair.raw_difference.diff_bbox, named.visual_difference_result.diff_bbox);
  assert.equal(pair.original_png, named.original_png);
  assert.equal(pair.split_png, named.split_png);
  assert.match(pair.assessment, /ANTIALIASING_NOISE_ONLY/);
  assert.equal(accepted.pair_count, summary.pair_count);
  assert.equal(accepted.state_count, summary.pair_count);
  assert.equal(accepted.viewports.length, summary.viewports.length);
  for (const vp of viewports) {
    assert.deepEqual([...accepted.viewports.find((v) => `${v.width}x${v.height}` === vp).states].sort(), [...summary.states_per_viewport[vp]].sort(), `${vp}: accepted states match the captured states`);
  }
  assert.equal(accepted.frozen_defects_preserved.length, 12, 'twelve frozen defects listed as preserved');
  assert.match(accepted.frozen_defects_preserved.join('\n'), /D9_NO_QA_HOOKS/);
});

test('T2 materialization enum chain promoted to ACCEPTED/PASS/ACCEPTED and bound to the capture head', () => {
  const mat = readJson(`${SRC}/split/materialization.json`);
  const accepted = readJson(`${SRC}/evidence/parity/accepted-parity.json`);
  assert.equal(mat.status, 'ACCEPTED');
  assert.equal(mat.parity_status, 'PASS');
  assert.equal(mat.next_stage, 'ACCEPTED');
  assert.equal(mat.parity_ref, 'evidence/parity/accepted-parity.json');
  assert.equal(mat.parity_evidence.exact_head, accepted.source_head, 'parity_evidence head equals the accepted parity head');
  assert.match(mat.parity_evidence.exact_head, /^[0-9a-f]{40}$/);
  assert.equal(mat.parity_evidence.capture_base_sha, accepted.provenance.capture_base_sha);
  assert.equal(mat.parity_evidence.central_acceptance_comment, 5556645775);
  assert.match(mat.status_note, /5556645775/, 'status note cites the CENTRAL acceptance comment');
  assert.doesNotMatch(mat.status_note, /do not exist yet/, 'the "artifact does not exist" wording must be gone');
  assert.doesNotMatch(mat.parity_status_note, /PENDING_EXACT_HEAD_CAPTURE was retained/, 'the pending-retention wording must be gone');
  assert.match(mat.parity_status_note, /PENDING_EXACT_HEAD_CAPTURE was replaced by PASS/, 'the replacement is recorded');
  assert.match(mat.next_stage_note, /Ready\/merge transitions remain owned by CENTRAL/);
  assert.equal(mat.source_candidate.branch, 'clean/src066-s3-mechanical-port');
  assert.equal(mat.generation, 'MECHANICAL_INLINE_EXTRACTION');
  assert.equal(mat.contracts.qa_hooks_added, false);
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

test('T4 candidate summary is the point-in-time candidate record bound to an exact capture head', () => {
  const summary = readJson(`${S4}/summary.json`);
  assert.equal(summary.source_id, 'SRC066');
  // The candidate summary is evidence captured at the candidate moment and is not
  // rewritten by the acceptance promotion (same convention as SRC069/SRC071): its
  // pending flags describe the capture, while the acceptance itself lives in
  // evidence/parity/accepted-parity.json.
  assert.equal(summary.status, 'CANDIDATE_PASS_CENTRAL_PENDING');
  assert.equal(summary.parity_result, 'CANDIDATE_PASS');
  assert.equal(summary.source_split_parity_pass, false, 'candidate record records the pre-acceptance gate state');
  assert.equal(summary.central_visual_acceptance, 'PENDING', 'candidate record records the pre-acceptance review state');
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

test('T10 the Drive handoff record matches the committed evidence', () => {
  const handoff = readJson(`${S4}/drive-handoff.json`);
  const summary = readJson(`${S4}/summary.json`);
  const pixel = readJson(`${S4}/pixel-diff.json`);
  const canonical = readJson(`${S4}/canonical-digest.json`);
  const manifest = readJson(`${S4}/evidence-manifest.json`);
  assert.equal(handoff.status, 'CENTRAL_PENDING');
  assert.equal(handoff.central_visual_acceptance, 'PENDING');
  assert.equal(handoff.provenance.capture_head_sha, summary.capture_head_sha);
  assert.equal(handoff.provenance.capture_base_sha, summary.base_sha);
  assert.deepEqual(handoff.provenance.harness_release_commits, Object.values(summary.harness_release_commits), 'handoff lists both harness release commits');
  assert.equal(handoff.provenance.authority_sha256, summary.authority.sha256);
  assert.equal(handoff.provenance.authority_bytes, summary.authority.bytes);
  assert.equal(handoff.result.pair_count, summary.pair_count);
  assert.equal(handoff.result.browser_errors + handoff.result.page_errors + handoff.result.failed_requests + handoff.result.external_requests, 0);
  assert.equal(handoff.contents.paired_pngs, 36, '36 side PNGs for 18 pairs');
  assert.equal(manifest.length, 36, 'evidence-manifest inventories one record per PNG');
  const pngs = fs.readdirSync(path.join(REPO, S4)).filter((f) => f.endsWith('.png')).sort();
  assert.deepEqual([...handoff.contents.s4_dir.filter((f) => f.endsWith('.png'))].sort(), pngs, 'handoff PNG list matches the directory');
  assert.equal(pngs.length, 36);
  const named = summary.screenshots.non_identical[0];
  const q = handoff.result.single_non_identical_pair;
  assert.equal(q.original_sha256, named.original_sha256, 'handoff names the real original digest');
  assert.equal(q.split_sha256, named.split_sha256, 'handoff names the real split digest');
  assert.equal(q.differing_pixels, named.visual_difference_result.differing_pixels);
  assert.equal(q.max_channel_delta_0_255, named.visual_difference_result.max_channel_delta_0_255);
  assert.deepEqual(q.diff_bbox, named.visual_difference_result.diff_bbox);
  assert.equal(pixel.pairs_with_differing_pixels, 1);
  assert.equal(canonical.canonical_sha_equal_count, 18);
  assert.equal(canonical.max_canonical_hamming, 0);
  // The handoff stays the point-in-time CENTRAL_PENDING candidate record; the
  // accepted record must cite the same immutable bundle.
  const accepted = readJson(`${SRC}/evidence/parity/accepted-parity.json`);
  assert.equal(accepted.drive_evidence.zip, handoff.zip_name, 'accepted record cites the same bundle name');
  assert.equal(accepted.drive_evidence.bytes, handoff.zip_bytes);
  assert.equal(accepted.drive_evidence.sha256, handoff.zip_sha256, 'accepted record cites the read-back bundle digest');
  assert.equal(accepted.drive_evidence.folder, handoff.drive_folder);
  assert.equal(accepted.drive_evidence.bundle_immutable, true);
});

test('T11 zero QA hooks and twelve frozen defects still preserved', () => {
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
