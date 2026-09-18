import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  MOTION_AWARE_SCREENSHOT_POLICY,
  validateAcceptedParityComparisons,
  validateMotionAwareParityFields,
} from '../src/08_harness/source-capsule-validator.mjs';

const structural = {
  dom: 'EQUAL',
  geometry: 'EQUAL',
  computed_style: 'EQUAL',
  runtime_state: 'EQUAL',
  interactions: 'EQUAL',
};

function pixelParity(screenshots = 'BYTE_IDENTICAL') {
  return {
    comparisons: { ...structural, screenshots },
    browser_errors: 0,
  };
}

function hammingParity() {
  return {
    comparisons: {
      ...structural,
      screenshots: 'CANONICAL_PIXEL_HAMMING_WITHIN_THRESHOLD',
      canonical_pixel_hamming_max: 8,
      canonical_pixel_threshold: 16,
    },
    browser_errors: 0,
    required_network_errors: 0,
    visual_review: { central_direct_artifact_review: true },
  };
}

function motionAwareParity() {
  return {
    comparisons: { ...structural, screenshots: MOTION_AWARE_SCREENSHOT_POLICY },
    parity_contract: 'SOURCE_SPECIFIC_MOTION_AWARE',
    raw_png_equality_used: false,
    pixel_tolerance_used: false,
    qa_clock_patch_used: false,
    qa_raf_patch_used: false,
    qa_runtime_hook_used: false,
    browser_errors: 0,
    required_network_errors: 0,
    visual_review: {
      central_direct_artifact_review: true,
      central_visual_pass: true,
    },
  };
}

function check(parity) {
  return validateAcceptedParityComparisons('SRCTST', parity, []);
}

test('A: existing BYTE_IDENTICAL enum still passes unchanged', () => {
  assert.deepEqual(check(pixelParity('BYTE_IDENTICAL')), []);
});

test('B: existing canonical pixel digest enum still passes unchanged', () => {
  assert.deepEqual(check(pixelParity('BYTE_IDENTICAL_CANONICAL_PIXEL_DIGEST')), []);
});

test('C: existing Hamming enum preserves its current threshold rules', () => {
  assert.deepEqual(check(hammingParity()), []);
  const landmark = hammingParity();
  landmark.comparisons.geometry = 'EQUAL_FOR_STABLE_SOURCE_LANDMARKS';
  landmark.comparisons.computed_style = 'EQUAL_FOR_STABLE_SOURCE_LANDMARKS';
  assert.deepEqual(check(landmark), []);
  const exceeds = hammingParity();
  exceeds.comparisons.canonical_pixel_hamming_max = 17;
  assert.ok(check(exceeds).some((f) => f.includes('Hamming exceeds threshold')));
  const badThreshold = hammingParity();
  badThreshold.comparisons.canonical_pixel_threshold = 33;
  assert.ok(check(badThreshold).some((f) => f.includes('Hamming threshold invalid')));
  const noReview = hammingParity();
  delete noReview.visual_review;
  assert.ok(check(noReview).some((f) => f.includes('Hamming parity requires direct CENTRAL artifact review')));
  const networkErrors = hammingParity();
  networkErrors.required_network_errors = 1;
  assert.ok(check(networkErrors).some((f) => f.includes('Hamming parity required-network errors')));
});

test('C: pixel enums are NOT forced to carry motion-aware attestation fields', () => {
  // Adding the new enum must not weaken or extend obligations of pixel enums.
  assert.deepEqual(check(pixelParity('BYTE_IDENTICAL')), []);
  assert.equal(validateMotionAwareParityFields('SRCTST', pixelParity()).length, 9);
});

test('D: motion-aware enum passes only with all required fields', () => {
  assert.deepEqual(check(motionAwareParity()), []);
  const landmark = motionAwareParity();
  landmark.comparisons.geometry = 'EQUAL_FOR_STABLE_SOURCE_LANDMARKS';
  landmark.comparisons.computed_style = 'EQUAL_FOR_STABLE_SOURCE_LANDMARKS';
  assert.deepEqual(check(landmark), []);
});

const motionNegatives = [
  ['central_direct_artifact_review=false', (p) => { p.visual_review.central_direct_artifact_review = false; }],
  ['central_visual_pass=false', (p) => { p.visual_review.central_visual_pass = false; }],
  ['central_visual_pass missing', (p) => { delete p.visual_review.central_visual_pass; }],
  ['missing parity_contract', (p) => { delete p.parity_contract; }],
  ['wrong parity_contract', (p) => { p.parity_contract = 'PIXEL_IDENTICAL'; }],
  ['raw_png_equality_used=true', (p) => { p.raw_png_equality_used = true; }],
  ['raw_png_equality_used missing', (p) => { delete p.raw_png_equality_used; }],
  ['pixel_tolerance_used=true', (p) => { p.pixel_tolerance_used = true; }],
  ['pixel_tolerance_used missing', (p) => { delete p.pixel_tolerance_used; }],
  ['qa_clock_patch_used=true', (p) => { p.qa_clock_patch_used = true; }],
  ['qa_clock_patch_used missing', (p) => { delete p.qa_clock_patch_used; }],
  ['qa_raf_patch_used=true', (p) => { p.qa_raf_patch_used = true; }],
  ['qa_raf_patch_used missing', (p) => { delete p.qa_raf_patch_used; }],
  ['qa_runtime_hook_used=true', (p) => { p.qa_runtime_hook_used = true; }],
  ['qa_runtime_hook_used missing', (p) => { delete p.qa_runtime_hook_used; }],
  ['browser_errors > 0', (p) => { p.browser_errors = 1; }],
  ['browser_errors missing', (p) => { delete p.browser_errors; }],
  ['required_network_errors > 0', (p) => { p.required_network_errors = 1; }],
  ['required_network_errors missing', (p) => { delete p.required_network_errors; }],
  ['DOM != EQUAL', (p) => { p.comparisons.dom = 'NEAR_EQUAL'; }],
  ['runtime_state != EQUAL', (p) => { p.comparisons.runtime_state = 'APPROXIMATE'; }],
  ['interactions != EQUAL', (p) => { p.comparisons.interactions = 'MOSTLY_EQUAL'; }],
];

for (const [label, mutate] of motionNegatives) {
  test(`D-negative: motion-aware enum fails closed when ${label}`, () => {
    const parity = motionAwareParity();
    mutate(parity);
    const failures = check(parity);
    assert.ok(failures.length > 0, `expected failure for ${label}`);
  });
}

test('D-negative: structural failures still reported alongside motion-aware obligations', () => {
  const parity = motionAwareParity();
  parity.comparisons.geometry = 'CLOSE';
  parity.comparisons.computed_style = 'CLOSE';
  const failures = check(parity);
  assert.ok(failures.some((f) => f.includes('parity comparison is not fully PASS')));
});

test('unknown screenshot enum fails closed', () => {
  const parity = pixelParity('PIXELISH_ENOUGH');
  const failures = check(parity);
  assert.ok(failures.some((f) => f.includes('parity comparison is not fully PASS')));
});

test('missing comparisons object fails closed for every consumer path', () => {
  assert.ok(check({}).some((f) => f.includes('parity comparison is not fully PASS')));
});

test('validate-mechanical-split.mjs wiring accepts the real repository end to end', () => {
  const repoRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..');
  const output = execFileSync(
    process.execPath,
    [path.join('src', '08_harness', 'validate-mechanical-split.mjs')],
    { encoding: 'utf8', cwd: repoRoot },
  );
  assert.match(output, /SRC_MECHANICAL_SPLIT_VALIDATE_COUNT=\d+/);
  assert.doesNotMatch(output, /FAIL/);
});
