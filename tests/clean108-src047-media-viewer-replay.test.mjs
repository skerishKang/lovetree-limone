import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  SRC047_ACT_TARGETS,
  SRC047_CANONICAL_MAX_HAMMING,
  SRC047_STATES,
  compareSRC047MediaViewerPair,
  replayApprovedSRC047MediaViewerPair,
  validateSRC047MediaViewerAuthority,
} from '../src/08_harness/state-replay/replay-approved-src047-media-viewer-pair.mjs';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const canonicalZero = Buffer.alloc(64, 0).toString('hex');

function acceptedStates(mobile = false) {
  return [
    'INITIAL',
    'ACT1_FIRST_FEELING',
    'ACT2_MOMENT',
    'ACT3_BLOOM',
    'ACT4_WHY_NEXT',
    'ACT5_LOVETREE',
    'MODAL_OPEN',
    mobile ? 'NAV_POPOVER_OPEN=NOT_APPLICABLE_MOBILE' : 'NAV_POPOVER_OPEN',
  ];
}

function makeAuthorityContract() {
  const authorityBytes = Buffer.from('<!doctype html><title>SRC047</title>');
  const authority = {
    bytes: authorityBytes.length,
    sha256: sha256(authorityBytes),
    status: 'LOCKED',
  };
  const manifest = {
    source_id: 'SRC047',
    authority,
    stages: {
      baseline_captured: true,
      mechanical_split_complete: true,
      source_split_parity_pass: true,
    },
  };
  const acceptedBaseline = {
    source_id: 'SRC047',
    status: 'ACCEPTED',
    captured_head: 'a'.repeat(40),
    authority: { bytes: authority.bytes, sha256: authority.sha256 },
  };
  const acceptedParity = {
    source_id: 'SRC047',
    status: 'ACCEPTED',
    source_head: 'b'.repeat(40),
    authority: { bytes: authority.bytes, sha256: authority.sha256 },
    viewports: [
      { width: 1280, height: 800, states: acceptedStates(false) },
      { width: 390, height: 844, states: acceptedStates(true) },
      { width: 320, height: 720, states: acceptedStates(true) },
    ],
    comparisons: {
      screenshots: 'CANONICAL_PIXEL_HAMMING_WITHIN_THRESHOLD',
      canonical_pixel_threshold: SRC047_CANONICAL_MAX_HAMMING,
    },
    runtime: {
      video_failed: false,
      duration_seconds: 14.187007,
    },
  };
  return { authorityBytes, manifest, acceptedBaseline, acceptedParity };
}

function metric() {
  return {
    tag: 'DIV',
    className: '',
    rect: { x: 10, y: 20, width: 100, height: 50 },
    display: 'block',
    visibility: 'visible',
    opacity: '1',
  };
}

function makeState(state, viewport) {
  const mobile = viewport.width <= 820;
  if (state === 'NAV_POPOVER_OPEN' && mobile) {
    return {
      stateName: 'NOT_APPLICABLE_MOBILE',
      state: { note: 'nav groups hidden by frozen responsive contract' },
      pngSha: null,
      pngCanonicalSha: null,
      pngCanonicalRaw: null,
    };
  }
  const actIndex = Object.keys(SRC047_ACT_TARGETS).indexOf(state);
  const currentTime = state in SRC047_ACT_TARGETS ? SRC047_ACT_TARGETS[state] : 10;
  return {
    stateName: state,
    state: {
      ids: ['stage', 'film'],
      elementCount: 2,
      buttonIds: ['playPause'],
      metrics: { stage: metric(), film: metric() },
      runtime: {
        videoFailed: false,
        act: actIndex >= 0 ? actIndex + 1 : null,
        modalOpen: state === 'MODAL_OPEN',
        navPopoverOpen: state === 'NAV_POPOVER_OPEN' ? 'Works' : null,
      },
      video: {
        duration: 14.187007,
        readyState: 4,
        currentTime,
      },
    },
    pngSha: `${state}-png`,
    pngCanonicalSha: `${state}-canonical`,
    pngCanonicalRaw: Buffer.from(canonicalZero, 'hex'),
  };
}

function makeCapture(viewport) {
  const states = Object.fromEntries(SRC047_STATES.map((state) => [state, makeState(state, viewport)]));
  return {
    states,
    interaction: { controlSurface: 'CINEMATIC_FRONTDOOR', playPauseClicked: true, muteClicked: true, progressRailClicked: true },
    errors: [],
    screenshots: {
      initial_sha256: 'initial',
      act1_first_feeling_sha256: 'act1',
      act2_moment_sha256: 'act2',
      act3_bloom_sha256: 'act3',
      act4_why_next_sha256: 'act4',
      act5_lovetree_sha256: 'act5',
      modal_sha256: 'modal',
      nav_sha256: viewport.width > 820 ? 'nav' : null,
      act1_first_feeling_canonical_sha256: 'c1',
      act1_first_feeling_canonical_raw_hex: canonicalZero,
      act2_moment_canonical_sha256: 'c2',
      act2_moment_canonical_raw_hex: canonicalZero,
      act3_bloom_canonical_sha256: 'c3',
      act3_bloom_canonical_raw_hex: canonicalZero,
      act4_why_next_canonical_sha256: 'c4',
      act4_why_next_canonical_raw_hex: canonicalZero,
      act5_lovetree_canonical_sha256: 'c5',
      act5_lovetree_canonical_raw_hex: canonicalZero,
      modal_canonical_sha256: 'cm',
      modal_canonical_raw_hex: canonicalZero,
      nav_canonical_sha256: viewport.width > 820 ? 'cn' : null,
      nav_canonical_raw_hex: viewport.width > 820 ? canonicalZero : null,
    },
  };
}

test('SRC047 accepted authority/baseline/parity contract passes without reinterpretation', () => {
  const contract = makeAuthorityContract();
  const result = validateSRC047MediaViewerAuthority(contract);
  assert.equal(result.passed, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.viewports.length, 3);
});

test('SRC047 accepted canonical threshold drift fails closed', () => {
  const contract = makeAuthorityContract();
  contract.acceptedParity.comparisons.canonical_pixel_threshold = 33;
  const result = validateSRC047MediaViewerAuthority(contract);
  assert.equal(result.passed, false);
  assert.ok(result.errors.includes('SRC047_CANONICAL_THRESHOLD_DRIFT'));
});

test('SRC047 desktop media/viewer matched pair passes the accepted S4 policy', () => {
  const viewport = { width: 1280, height: 800 };
  const original = makeCapture(viewport);
  const split = makeCapture(viewport);
  const result = compareSRC047MediaViewerPair({ original, split, viewport });
  assert.equal(result.passed, true);
  assert.deepEqual(result.errors, []);
  assert.equal(Object.values(result.comparison.states).filter(Boolean).length, 8);
});

test('SRC047 canonical visual drift beyond the accepted threshold fails closed', () => {
  const viewport = { width: 1280, height: 800 };
  const original = makeCapture(viewport);
  const split = makeCapture(viewport);
  const drift = Buffer.alloc(64, 0);
  drift.fill(1, 0, SRC047_CANONICAL_MAX_HAMMING + 1);
  split.screenshots.act3_bloom_canonical_raw_hex = drift.toString('hex');
  const result = compareSRC047MediaViewerPair({ original, split, viewport });
  assert.equal(result.passed, false);
  assert.ok(result.errors.some((error) => error.startsWith('SRC047_CANONICAL_PIXEL_DRIFT:1280x800:ACT3_BLOOM:33')));
});

test('SRC047 canonical ACT seek drift fails closed', () => {
  const viewport = { width: 1280, height: 800 };
  const original = makeCapture(viewport);
  const split = makeCapture(viewport);
  split.states.ACT2_MOMENT.state.video.currentTime = 8;
  const result = compareSRC047MediaViewerPair({ original, split, viewport });
  assert.equal(result.passed, false);
  assert.ok(result.errors.includes('SRC047_SPLIT_ACT_TIME_DRIFT:1280x800:ACT2_MOMENT'));
});

test('SRC047 mobile NAV must remain explicitly not applicable', () => {
  const viewport = { width: 390, height: 844 };
  const original = makeCapture(viewport);
  const split = makeCapture(viewport);
  split.states.NAV_POPOVER_OPEN.stateName = 'NAV_POPOVER_OPEN';
  const result = compareSRC047MediaViewerPair({ original, split, viewport });
  assert.equal(result.passed, false);
  assert.ok(result.errors.includes('SRC047_MOBILE_NAV_DISPOSITION_DRIFT:390x844'));
});

test('SRC047 replay refuses non-branded browser before filesystem/browser work', async () => {
  await assert.rejects(
    replayApprovedSRC047MediaViewerPair({ exactHead: 'c'.repeat(40), browserChannel: null }),
    /SRC047_BRANDED_CHROME_REQUIRED/,
  );
});
