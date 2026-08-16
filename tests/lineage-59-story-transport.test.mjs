import assert from "node:assert/strict";
import test from "node:test";

import {
  createStoryState,
  startStory,
  pauseStory,
  resumeStory,
  stopStory,
  setStorySpeed,
  advanceStoryPhase,
  getStoryPhaseDurations,
  getEffectiveDuration,
  cycleSpeed,
} from "../lib/lineage-59/story-transport.ts";

test("story-transport creates idle", () => {
  const s = createStoryState();
  assert.equal(s.phase, "idle");
  assert.equal(s.playing, false);
  assert.equal(s.paused, false);
  assert.equal(s.speed, 1);
});

test("story-transport startStory transitions to holding", () => {
  const s = startStory(createStoryState());
  assert.equal(s.phase, "holding");
  assert.equal(s.playing, true);
});

test("story-transport pauseStory pauses", () => {
  const s = pauseStory(startStory(createStoryState()));
  assert.equal(s.paused, true);
  assert.equal(s.playing, false);
});

test("story-transport resumeStory resumes", () => {
  const s = resumeStory(pauseStory(startStory(createStoryState())));
  assert.equal(s.paused, false);
  assert.equal(s.playing, true);
});

test("story-transport resumeStory does not resume from ended", () => {
  const ended = { ...createStoryState(), phase: "ended" };
  assert.equal(resumeStory(ended).paused, false);
});

test("story-transport stopStory goes to idle", () => {
  const s = stopStory(startStory(createStoryState()));
  assert.equal(s.phase, "idle");
  assert.equal(s.playing, false);
});

test("story-transport setStorySpeed", () => {
  const s = setStorySpeed(createStoryState(), 2);
  assert.equal(s.speed, 2);
});

test("story-transport advanceStoryPhase", () => {
  const s = advanceStoryPhase(createStoryState(), "why-next");
  assert.equal(s.phase, "why-next");
});

test("story-transport getEffectiveDuration divides by speed", () => {
  assert.equal(getEffectiveDuration(1000, 2), 500);
  assert.ok(Math.abs(getEffectiveDuration(1000, 0.75) - 1333.333) < 0.1);
});

test("story-transport getStoryPhaseDurations returns all phases", () => {
  const d = getStoryPhaseDurations(createStoryState());
  assert.ok(d.hold > 0);
  assert.ok(d.whyNext > 0);
  assert.ok(d.pageTurn > 0);
  assert.ok(d.landing > 0);
});

test("story-transport cycleSpeed cycles through valid speeds", () => {
  assert.equal(cycleSpeed(0.75), 1);
  assert.equal(cycleSpeed(1), 1.5);
  assert.equal(cycleSpeed(1.5), 2);
  assert.equal(cycleSpeed(2), 0.75);
});