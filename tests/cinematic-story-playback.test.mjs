import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  chapterForCinematicProgress,
  cinematicElapsedFromProgress,
  cinematicProgressFromElapsed,
  createCinematicStoryPlaybackState,
  reduceCinematicStoryPlayback,
} from "../lib/cinematic-story-playback.ts";

const root = new URL("../", import.meta.url);
const chapters = [
  { id: "a", title: "A", momentLabel: "A moment", startProgress: 0 },
  { id: "b", title: "B", momentLabel: "B moment", startProgress: 0.25 },
  { id: "c", title: "C", momentLabel: "C moment", startProgress: 0.5 },
  { id: "d", title: "D", momentLabel: "D moment", startProgress: 0.75 },
];

const reduce = (state, action) => reduceCinematicStoryPlayback(state, action, chapters);

test("CAP-13 maps elapsed time, normalized progress and chapter boundaries deterministically", () => {
  assert.equal(cinematicProgressFromElapsed(20, 80), 0.25);
  assert.equal(cinematicElapsedFromProgress(0.25, 80), 20);
  assert.equal(chapterForCinematicProgress(chapters, 0)?.id, "a");
  assert.equal(chapterForCinematicProgress(chapters, 0.249)?.id, "a");
  assert.equal(chapterForCinematicProgress(chapters, 0.25)?.id, "b");
  assert.equal(chapterForCinematicProgress(chapters, 0.74)?.id, "c");
  assert.equal(chapterForCinematicProgress(chapters, 1)?.id, "d");
});

test("playback advances only while playing and ends exactly at duration", () => {
  const initial = createCinematicStoryPlaybackState(chapters, 80);
  const ignored = reduce(initial, { type: "advance", deltaSeconds: 12 });
  assert.deepEqual(ignored, initial);

  const playing = reduce(initial, { type: "play" });
  const advanced = reduce(playing, { type: "advance", deltaSeconds: 20 });
  assert.equal(advanced.elapsedSeconds, 20);
  assert.equal(advanced.progress, 0.25);
  assert.equal(advanced.activeChapterId, "b");
  assert.equal(advanced.mode, "playing");

  const ended = reduce(advanced, { type: "advance", deltaSeconds: 100 });
  assert.equal(ended.elapsedSeconds, 80);
  assert.equal(ended.progress, 1);
  assert.equal(ended.activeChapterId, "d");
  assert.equal(ended.mode, "ended");
});

test("manual intervention always pauses guided playback while preserving the chosen position", () => {
  const playing = reduce(createCinematicStoryPlaybackState(chapters, 80), { type: "play" });
  const takeover = reduce(playing, { type: "manual-takeover", progress: 0.55 });

  assert.equal(takeover.mode, "paused");
  assert.equal(takeover.takeover, "manual");
  assert.equal(takeover.progress, 0.55);
  assert.equal(takeover.elapsedSeconds, 44);
  assert.equal(takeover.activeChapterId, "c");
  assert.deepEqual(reduce(takeover, { type: "advance", deltaSeconds: 10 }), takeover);

  const resumed = reduce(takeover, { type: "play" });
  assert.equal(resumed.mode, "playing");
  assert.equal(resumed.takeover, "none");
  assert.equal(resumed.progress, 0.55);
});

test("seek and restart clamp invalid boundaries safely", () => {
  const initial = createCinematicStoryPlaybackState(chapters, 80);
  const below = reduce(initial, { type: "seek-progress", progress: -5 });
  assert.equal(below.progress, 0);
  assert.equal(below.activeChapterId, "a");

  const above = reduce(initial, { type: "seek-progress", progress: 5 });
  assert.equal(above.progress, 1);
  assert.equal(above.elapsedSeconds, 80);
  assert.equal(above.mode, "ended");

  const restarted = reduce(above, { type: "restart" });
  assert.equal(restarted.progress, 0);
  assert.equal(restarted.elapsedSeconds, 0);
  assert.equal(restarted.activeChapterId, "a");
  assert.equal(restarted.mode, "playing");
  assert.equal(restarted.takeover, "none");
});

test("CAP-13 route uses one reducer core, explicit manual takeover and no forced page auto-scroll", async () => {
  const page = await readFile(
    new URL("app/design-lab/capabilities/cinematic-playback/page.tsx", root),
    "utf8",
  );

  assert.match(page, /reduceCinematicStoryPlayback/);
  assert.match(page, /manual-takeover/);
  assert.match(page, /onWheel/);
  assert.match(page, /onTouchStart/);
  assert.match(page, /type="range"/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /CAP-13 · INTERNAL MECHANIC PROTOTYPE · ISSUE #116/);
  assert.match(page, /29,743 bytes/);
  assert.match(page, /a5f462c4…500239dc/);
  assert.doesNotMatch(page, /scrollBy\(|scrollTo\(|scrollIntoView\(/);
  assert.doesNotMatch(page, /fetch\(|\/api\/|firebase|signedUrl/i);
});

test("CAP-13 mobile and reduced-motion contracts are explicit", async () => {
  const css = await readFile(
    new URL("app/styles/cinematic-story-playback.css", root),
    "utf8",
  );

  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.lt-cinematic-playback__rules\s*\{\s*grid-template-columns:\s*1fr;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /transition-duration:\s*0\.001ms/);
  assert.match(css, /animation-duration:\s*0\.001ms/);
});
