import assert from "node:assert/strict";
import test from "node:test";

import {
  assertValidResumePolicy,
  assertValidTransportState,
  canAutoAdvance,
  createTransportAuthorityState,
  pauseTransport,
  playTransport,
  reduceTransportAuthority,
  releaseManualTakeover,
  restartTransport,
  startManualTakeover,
} from "../lib/design-runtime/transport.ts";

test("transport authority: initial state defaults to playing=true, manuallyOwned=false", () => {
  const defaultState = createTransportAuthorityState();
  assert.equal(defaultState.playing, true);
  assert.equal(defaultState.manuallyOwned, false);
  assert.equal(canAutoAdvance(defaultState), true);

  const customState = createTransportAuthorityState({
    initialPlaying: false,
    initiallyManuallyOwned: true,
  });
  assert.equal(customState.playing, false);
  assert.equal(customState.manuallyOwned, true);
  assert.equal(canAutoAdvance(customState), false);
});

test("transport authority: play/pause/restart transitions are deterministic", () => {
  const initial = createTransportAuthorityState({ initialPlaying: true });

  // Pause
  const paused = pauseTransport(initial);
  assert.equal(paused.playing, false);
  assert.equal(paused.manuallyOwned, false);
  assert.equal(canAutoAdvance(paused), false);

  // Play from paused
  const playing = playTransport(paused);
  assert.equal(playing.playing, true);
  assert.equal(playing.manuallyOwned, false);
  assert.equal(canAutoAdvance(playing), true);

  // Restart
  const restarted = restartTransport(paused);
  assert.equal(restarted.playing, true);
  assert.equal(restarted.manuallyOwned, false);
  assert.equal(canAutoAdvance(restarted), true);
});

test("transport authority: manual takeover blocks auto-advance authority", () => {
  const playing = createTransportAuthorityState({ initialPlaying: true });
  assert.equal(canAutoAdvance(playing), true);

  // VideoFigure style: manual takeover without pausing playing flag
  const manual = startManualTakeover(playing);
  assert.equal(manual.playing, true);
  assert.equal(manual.manuallyOwned, true);
  assert.equal(canAutoAdvance(manual), false, "manuallyOwned blocks canAutoAdvance");

  // Memory Anatomy style: manual takeover with explicit pausePlayback
  const manualPaused = startManualTakeover(playing, { pausePlayback: true });
  assert.equal(manualPaused.playing, false);
  assert.equal(manualPaused.manuallyOwned, true);
  assert.equal(canAutoAdvance(manualPaused), false);
});

test("transport authority: resume-after-idle clears manual takeover and restores auto authority if playing", () => {
  const initial = createTransportAuthorityState({ initialPlaying: true });
  const manual = startManualTakeover(initial);
  assert.equal(canAutoAdvance(manual), false);

  const released = releaseManualTakeover(manual, "resume-after-idle");
  assert.equal(released.playing, true);
  assert.equal(released.manuallyOwned, false);
  assert.equal(canAutoAdvance(released), true, "auto-advance resumes after idle under resume-after-idle policy");
});

test("transport authority: resume-after-idle preserves paused state if transport was paused before", () => {
  const paused = createTransportAuthorityState({ initialPlaying: false });
  const manual = startManualTakeover(paused);
  assert.equal(manual.playing, false);
  assert.equal(manual.manuallyOwned, true);

  const released = releaseManualTakeover(manual, "resume-after-idle");
  assert.equal(released.playing, false);
  assert.equal(released.manuallyOwned, false);
  assert.equal(canAutoAdvance(released), false, "cannot auto-advance because playing is false");
});

test("transport authority: stay-paused policy forces transport to stay paused upon manual release", () => {
  const initial = createTransportAuthorityState({ initialPlaying: true });
  const manual = startManualTakeover(initial);
  assert.equal(manual.playing, true);
  assert.equal(manual.manuallyOwned, true);

  const released = releaseManualTakeover(manual, "stay-paused");
  assert.equal(released.playing, false, "stay-paused forces playing to false");
  assert.equal(released.manuallyOwned, false);
  assert.equal(canAutoAdvance(released), false, "auto-advance must never resume under stay-paused");
});

test("transport authority: play transition clears existing manual ownership", () => {
  const manual = createTransportAuthorityState({ initialPlaying: false, initiallyManuallyOwned: true });
  assert.equal(manual.manuallyOwned, true);
  assert.equal(canAutoAdvance(manual), false);

  const playing = playTransport(manual);
  assert.equal(playing.playing, true);
  assert.equal(playing.manuallyOwned, false);
  assert.equal(canAutoAdvance(playing), true);
});

test("transport authority: reduceTransportAuthority handles all action types deterministically", () => {
  let state = createTransportAuthorityState({ initialPlaying: true });

  // manual-start
  state = reduceTransportAuthority(state, { type: "manual-start" });
  assert.equal(state.manuallyOwned, true);
  assert.equal(canAutoAdvance(state), false);

  // manual-end (resume-after-idle)
  state = reduceTransportAuthority(state, { type: "manual-end", resumePolicy: "resume-after-idle" });
  assert.equal(state.manuallyOwned, false);
  assert.equal(canAutoAdvance(state), true);

  // pause
  state = reduceTransportAuthority(state, { type: "pause" });
  assert.equal(state.playing, false);

  // play
  state = reduceTransportAuthority(state, { type: "play" });
  assert.equal(state.playing, true);

  // restart
  state = reduceTransportAuthority(state, { type: "restart" });
  assert.equal(state.playing, true);
  assert.equal(state.manuallyOwned, false);
});

test("transport authority: invalid policy or state transitions fail closed", () => {
  assert.throws(() => assertValidResumePolicy("invalid-policy"), TypeError);
  assert.throws(() => assertValidResumePolicy(""), TypeError);
  assert.throws(() => assertValidResumePolicy(null), TypeError);

  assert.throws(() => assertValidTransportState(null), TypeError);
  assert.throws(() => assertValidTransportState({ playing: "true", manuallyOwned: false }), TypeError);
  assert.throws(() => assertValidTransportState({ playing: true }), TypeError);

  const valid = createTransportAuthorityState();
  assert.throws(() => releaseManualTakeover(valid, "unsupported"), TypeError);
  assert.throws(() => reduceTransportAuthority(valid, { type: "unknown-action" }), TypeError);
});

test("transport authority: pure functions do not mutate caller state", () => {
  const state = Object.freeze(createTransportAuthorityState({ initialPlaying: true, initiallyManuallyOwned: false }));

  const paused = pauseTransport(state);
  assert.notEqual(paused, state);
  assert.equal(state.playing, true);

  const manual = startManualTakeover(state);
  assert.notEqual(manual, state);
  assert.equal(state.manuallyOwned, false);

  const frozenManual = Object.freeze(manual);
  const released = releaseManualTakeover(frozenManual, "resume-after-idle");
  assert.notEqual(released, frozenManual);
  assert.equal(frozenManual.manuallyOwned, true);
});
