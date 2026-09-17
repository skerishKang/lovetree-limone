import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  SRC062_MAX_CHANNEL_DELTA,
  SRC062_PIXEL_MISMATCH_THRESHOLD,
  SRC062_VIEWPORTS,
  compareSRC062LargeInlinePair,
  normalizeSRC062ReplayValue,
  validateSRC062LargeInlineAuthority,
  validateSRC062PixelDiff,
} from '../src/08_harness/state-replay/replay-approved-src062-large-inline-pair.mjs';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function authorityFixture() {
  const authorityBytes = Buffer.from('src062-authority');
  const splitIndexBytes = Buffer.from('src062-index');
  const splitStylesBytes = Buffer.from('src062-styles');
  const splitScriptBytes = Buffer.from('src062-script');
  const authority = { bytes: authorityBytes.length, sha256: sha256(authorityBytes) };
  const split = {
    index_sha256: sha256(splitIndexBytes),
    styles_sha256: sha256(splitStylesBytes),
    script_sha256: sha256(splitScriptBytes),
  };
  return {
    authorityBytes,
    splitIndexBytes,
    splitStylesBytes,
    splitScriptBytes,
    manifest: {
      source_id: 'SRC062',
      authority: { ...authority, status: 'LOCKED' },
      stages: {
        baseline_captured: true,
        mechanical_split_complete: true,
        source_split_parity_pass: true,
      },
      source_contract: { qa_hook: 'window.__track62' },
    },
    acceptedBaseline: {
      source_id: 'SRC062',
      status: 'ACCEPTED',
      authority,
    },
    acceptedParity: {
      source_id: 'SRC062',
      status: 'ACCEPTED',
      authority,
      split,
      viewports: SRC062_VIEWPORTS.map(({ width, height, states }) => ({ width, height, states: [...states] })),
      comparisons: {
        dom: 'EQUAL',
        geometry: 'EQUAL',
        computed_style: 'EQUAL',
        runtime_state: 'EQUAL',
        interactions: 'EQUAL',
        screenshots: 'CANONICAL_PIXEL_HAMMING_WITHIN_THRESHOLD',
        canonical_pixel_threshold: SRC062_PIXEL_MISMATCH_THRESHOLD,
      },
      screenshot_review: {
        pair_count: 24,
        max_channel_delta_0_255: SRC062_MAX_CHANNEL_DELTA,
        central_assessment: 'ANTIALIASING_NOISE_ONLY',
      },
      browser: { console_errors: 0, page_errors: 0, failed_requests: 0 },
    },
  };
}

function expectedInteractions(viewport) {
  const common = {
    RAIL_FRACTIONAL_MOVE: true,
    SNAP_TO_SCENE: true,
    ACTIVE_SCULPTURE_SHORT_TAP: 'OPENS_VIEWER',
    DRAG_GREATER_THAN_9PX: 'DOES_NOT_OPEN_VIEWER',
    VIEWER_CLOSE_PHASE_RESTORED: true,
    MEMORY_FILMS_CARD_TO_VIEWER: 'OPENS_VIEWER',
    PANEL_CLOSE_PHASE_RESTORED: true,
  };
  return viewport.width >= 1024 ? { ...common, SCENE07_MEMORY_PATH: true } : common;
}

function captureFixture(viewport, phaseDelta = 0) {
  const states = Object.fromEntries(viewport.states.map((state, index) => [state, {
    ids: ['stage', 'railRing', 'viewer', 'panel'],
    elementCount: 42,
    metrics: { stage: { rect: { x: 0, y: 0, width: viewport.width, height: viewport.height } } },
    trackState: {
      phase: index + 0.12344 + phaseDelta,
      targetPhase: index + 0.12344 + phaseDelta,
      velocity: 0.00041 + phaseDelta,
      active: index,
    },
    viewerOpen: state.includes('VIEWER'),
    panelOpen: state.includes('PANEL'),
  }]));
  return {
    states,
    screenshots: {},
    interaction: expectedInteractions(viewport),
    errors: [],
    failedRequests: [],
  };
}

test('SRC062 accepted authority/S4 policy validates fail-closed', () => {
  const fixture = authorityFixture();
  const result = validateSRC062LargeInlineAuthority(fixture);
  assert.equal(result.passed, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.viewports.length, 4);
  assert.equal(result.viewports.reduce((sum, viewport) => sum + viewport.states.length, 0), 24);
});

test('SRC062 authority rejects accepted pixel-policy drift and split hash drift', () => {
  const fixture = authorityFixture();
  fixture.acceptedParity.comparisons.canonical_pixel_threshold = 33;
  fixture.acceptedParity.split.script_sha256 = '0'.repeat(64);
  const result = validateSRC062LargeInlineAuthority(fixture);
  assert.equal(result.passed, false);
  assert.ok(result.errors.includes('SRC062_PIXEL_THRESHOLD_DRIFT'));
  assert.ok(result.errors.includes('SRC062_SPLIT_HASH_MISMATCH:script_sha256'));
});

test('SRC062 authority rejects viewport/state matrix drift', () => {
  const fixture = authorityFixture();
  fixture.acceptedParity.viewports[1].states = fixture.acceptedParity.viewports[1].states.slice(0, -1);
  const result = validateSRC062LargeInlineAuthority(fixture);
  assert.equal(result.passed, false);
  assert.ok(result.errors.includes('SRC062_ACCEPTED_STATE_MATRIX_DRIFT:390x844'));
});

test('SRC062 three-decimal normalization absorbs only sub-millisecond settle residue', () => {
  assert.deepEqual(
    normalizeSRC062ReplayValue({ phase: 1.23441, nested: [0.00041] }),
    { phase: 1.234, nested: [0] },
  );
  assert.notDeepEqual(
    normalizeSRC062ReplayValue({ phase: 1.23441 }),
    normalizeSRC062ReplayValue({ phase: 1.23601 }),
  );
});

test('SRC062 matched pair accepts approved state matrix after three-decimal normalization', () => {
  const viewport = SRC062_VIEWPORTS[0];
  const original = captureFixture(viewport, 0);
  const split = captureFixture(viewport, 0.00001);
  const result = compareSRC062LargeInlinePair({ original, split, viewport });
  assert.equal(result.passed, true);
  assert.equal(Object.values(result.comparison.states).filter(Boolean).length, 6);
  assert.equal(result.comparison.interactionEqual, true);
});

test('SRC062 matched pair fails closed on material runtime or interaction drift', () => {
  const viewport = SRC062_VIEWPORTS[1];
  const original = captureFixture(viewport, 0);
  const split = captureFixture(viewport, 0);
  split.states.M03_SWIPE_TRAVEL_SCENE06.trackState.phase += 1;
  split.interaction.SNAP_TO_SCENE = false;
  const result = compareSRC062LargeInlinePair({ original, split, viewport });
  assert.equal(result.passed, false);
  assert.ok(result.errors.includes('SRC062_STATE_DRIFT:390x844:M03_SWIPE_TRAVEL_SCENE06'));
  assert.ok(result.errors.includes('SRC062_INTERACTION_DRIFT:390x844'));
  assert.ok(result.errors.includes('SRC062_SPLIT_INTERACTION_FAILED:390x844:SNAP_TO_SCENE'));
});

test('SRC062 matched pair fails closed on browser/request errors', () => {
  const viewport = SRC062_VIEWPORTS[2];
  const original = captureFixture(viewport, 0);
  const split = captureFixture(viewport, 0);
  original.errors.push('console:boom');
  split.failedRequests.push('http://example.invalid :: failed');
  const result = compareSRC062LargeInlinePair({ original, split, viewport });
  assert.equal(result.passed, false);
  assert.ok(result.errors.includes('SRC062_ORIGINAL_BROWSER_ERRORS:320x720'));
  assert.ok(result.errors.includes('SRC062_SPLIT_FAILED_REQUESTS:320x720'));
});

test('SRC062 pixel policy preserves accepted 32-pixel / 1-channel thresholds', () => {
  assert.equal(validateSRC062PixelDiff({
    width: 1440,
    height: 900,
    differingPixels: 32,
    maxChannelDelta: 1,
  }).passed, true);

  const tooManyPixels = validateSRC062PixelDiff({
    width: 1440,
    height: 900,
    differingPixels: 33,
    maxChannelDelta: 1,
  });
  assert.equal(tooManyPixels.passed, false);
  assert.ok(tooManyPixels.errors.includes('SRC062_PIXEL_MISMATCH_EXCEEDS_THRESHOLD:33'));

  const channelDrift = validateSRC062PixelDiff({
    width: 1440,
    height: 900,
    differingPixels: 1,
    maxChannelDelta: 2,
  });
  assert.equal(channelDrift.passed, false);
  assert.ok(channelDrift.errors.includes('SRC062_PIXEL_CHANNEL_DELTA_EXCEEDS_THRESHOLD:2'));
});
