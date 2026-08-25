import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sourcePath = new URL(
  '../reference/source-tracks-snapshot/24_영상기억_워크플로우/01_영상기억워크플로우_v1.html',
  import.meta.url,
);
const manifestPath = new URL(
  '../design-intake/manifests/source-track-24-video-memory-workflow-v1-donor.json',
  import.meta.url,
);
const componentPath = new URL(
  '../app/design-lab/source-tracks/24/v1/donor/SourceTrack24V1DonorNativePage.tsx',
  import.meta.url,
);
const cssPath = new URL(
  '../app/design-lab/source-tracks/24/v1/donor/SourceTrack24V1DonorNativePage.module.css',
  import.meta.url,
);
const authorityPath = new URL('../lib/sourceTrack24V1DonorNative.ts', import.meta.url);

const source = readFileSync(sourcePath, 'utf8');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const component = readFileSync(componentPath, 'utf8');
const css = readFileSync(cssPath, 'utf8');
const authority = readFileSync(authorityPath, 'utf8');

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

test('Track24 donor pins the exact #284/#287 source snapshot', () => {
  assert.equal(sha256(source), '438cbcbeb522cb64c4eb68edeef6713c469a35cfd45cac352d142cd0fade29ba');
  assert.equal(manifest.issue, 479);
  assert.deepEqual(manifest.master_rows, [81]);
  assert.equal(manifest.product_job, 'TOOLS');
  assert.equal(manifest.source_authority.snapshot_issue, 284);
  assert.equal(manifest.source_authority.snapshot_pr, 287);
  assert.equal(manifest.source_authority.sha256, sha256(source));
});

test('source limitations stay explicit rather than being promoted as canonical product truth', () => {
  assert.match(source, /setTimeout\s*\(/);
  assert.match(source, /youtube-nocookie\.com/);
  assert.equal(source.includes('localStorage'), false);
  assert.equal(manifest.source_character.canonical_persistence, false);
  assert.equal(manifest.source_character.timer_simulation_present, true);
  assert.equal(manifest.source_character.external_youtube_embed_present, true);
  assert.equal(manifest.product_disposition, 'USE_AS_VISUAL_FUNCTION_DONOR');
});

test('native proof remediates responsive, keyboard and reduced-motion boundaries', () => {
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /:focus-visible/);
  assert.match(component, /aria-current/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /disabled=\{activeStage === 0\}/);
  assert.equal(manifest.source_character.native_proof_mobile_remediation, true);
  assert.equal(manifest.source_character.native_proof_keyboard_focus_remediation, true);
  assert.equal(manifest.source_character.native_proof_reduced_motion_remediation, true);
});

test('donor proof hands off to canonical LoveTree without a parallel editor backend', () => {
  assert.equal(manifest.native_proof.route, '/design-lab/source-tracks/24/v1/donor');
  assert.equal(manifest.native_proof.canonical_handoff, '/v4');
  assert.equal(manifest.native_proof.production_route_mutation, false);
  assert.equal(manifest.native_proof.canonical_data_mutation, false);
  assert.match(authority, /canonicalHandoff: '\/v4'/);
  assert.match(component, /SOURCE_TRACK_24_V1_DONOR\.canonicalHandoff/);
  assert.doesNotMatch(component, /youtube-nocookie|<iframe|localStorage|fetch\(/);
});

test('Track24 remains a single family row and does not mutate the shared ledger contract', () => {
  assert.deepEqual(manifest.master_rows, [81]);
  assert.match(authority, /masterRow: 81/);
  assert.doesNotMatch(component, /master-design-coverage/);
});
