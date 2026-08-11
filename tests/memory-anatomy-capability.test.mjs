import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  MEMORY_ANATOMY_LAYER_IDS,
  SYNTHETIC_MEMORY_FIXTURE,
  adjacentLayerId,
  createMemoryAnatomyState,
  memoryAnatomyReducer,
  memoryLayerTransform,
  projectMomentToMemoryAnatomy,
  selectedMemoryLayer,
} from "../lib/memory-anatomy.ts";

const SOURCE = new URL("../reference/design-lab/capabilities/memory-anatomy/02-memory-stack.html", import.meta.url);
const COMPONENT = new URL("../app/design-lab/capabilities/memory-anatomy/MemoryAnatomyExperience.tsx", import.meta.url);
const CSS = new URL("../app/design-lab/capabilities/memory-anatomy/memory-anatomy.module.css", import.meta.url);

const EXPECTED_ORDER = [
  ["source-video", "SOURCE VIDEO", "ORIGINAL"],
  ["moment-cut", "MOMENT CUT", "TIMECODE"],
  ["person-lock", "PERSON LOCK", "IDENTITY"],
  ["outfit-map", "OUTFIT MAP", "COSTUME"],
  ["emotion", "EMOTION", "FEELING"],
  ["my-note", "MY NOTE", "PERSONAL"],
  ["connection", "CONNECTION", "NEXT PATH"],
];

// Continuous pointer-rotation products (delta * sensitivity) are IEEE-754
// approximations of their semantic values, so compare within machine
// precision instead of demanding exact integer equality.
function assertNearlyEqual(actual, expected) {
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(expected)) * 16;
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test("Memory Stack source provenance is byte exact", async () => {
  const bytes = await readFile(SOURCE);
  assert.equal(bytes.byteLength, 15578);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "0114c705dcb316b99e46931cd131e2ae211c4e5824b759ccb9f594ea31e23785");
});

test("projection exposes exactly seven ordered semantic layers", () => {
  const layers = projectMomentToMemoryAnatomy(SYNTHETIC_MEMORY_FIXTURE);
  assert.equal(layers.length, 7);
  assert.deepEqual(layers.map((layer) => [layer.id, layer.title, layer.subtitle]), EXPECTED_ORDER);
  assert.deepEqual([...MEMORY_ANATOMY_LAYER_IDS], EXPECTED_ORDER.map(([id]) => id));
});

test("projection keeps canonical Moment meanings separate", () => {
  const layers = projectMomentToMemoryAnatomy(SYNTHETIC_MEMORY_FIXTURE);
  assert.match(layers[0].meta.join(" "), /Stage video/);
  assert.match(layers[1].meta.join(" "), /18\.24s/);
  assert.match(layers[2].meta.join(" "), /Demo subject A/);
  assert.match(layers[3].meta.join(" "), /Black crystal stage look/);
  assert.match(layers[4].meta.join(" "), /Awe \+ tenderness/);
  assert.match(layers[5].meta.join(" "), /wanted to remember/);
  assert.match(layers[6].meta.join(" "), /Backstage smile/);
});

test("selectedLayer is one canonical authority", () => {
  const layers = projectMomentToMemoryAnatomy(SYNTHETIC_MEMORY_FIXTURE);
  let state = createMemoryAnatomyState();
  state = memoryAnatomyReducer(state, { type: "select-layer", id: "emotion" });
  assert.equal(state.selectedLayerId, "emotion");
  assert.equal(state.playbackStep, 4);
  assert.equal(selectedMemoryLayer(layers, state).title, "EMOTION");
});

test("assemble explode and arbitrary explosion are deterministic and clamped", () => {
  let state = createMemoryAnatomyState();
  state = memoryAnatomyReducer(state, { type: "assemble" });
  assert.equal(state.explosion, 0);
  state = memoryAnatomyReducer(state, { type: "explode" });
  assert.equal(state.explosion, 1);
  state = memoryAnatomyReducer(state, { type: "set-explosion", value: 0.37 });
  assert.equal(state.explosion, 0.37);
  state = memoryAnatomyReducer(state, { type: "set-explosion", value: 2 });
  assert.equal(state.explosion, 1);
});

test("rotation state is pure and bounded", () => {
  const initial = createMemoryAnatomyState();
  const moved = memoryAnatomyReducer(initial, { type: "rotate-by", deltaX: 100, deltaY: -100 });
  assertNearlyEqual(moved.rotationY, initial.rotationY + 18);
  assertNearlyEqual(moved.rotationX, 2);
  assert.match(memoryLayerTransform(6, moved), /translate3d/);
});

test("story transport advances 1 through 7 and reassembles on completion", () => {
  let state = memoryAnatomyReducer(createMemoryAnatomyState(), { type: "play" });
  assert.equal(state.playback, "playing");
  assert.equal(state.explosion, 0.88);
  assert.equal(state.selectedLayerId, "source-video");
  for (let step = 1; step < 7; step += 1) {
    state = memoryAnatomyReducer(state, { type: "playback-tick" });
    assert.equal(state.selectedLayerId, MEMORY_ANATOMY_LAYER_IDS[step]);
  }
  state = memoryAnatomyReducer(state, { type: "playback-tick" });
  assert.equal(state.playback, "complete");
  assert.equal(state.explosion, 0);
  assert.equal(state.selectedLayerId, "connection");
});

test("pause replay and manual takeover preserve user authority", () => {
  let state = memoryAnatomyReducer(createMemoryAnatomyState(), { type: "play" });
  state = memoryAnatomyReducer(state, { type: "pause" });
  assert.equal(state.playback, "paused");
  state = memoryAnatomyReducer(state, { type: "replay" });
  assert.equal(state.playback, "playing");
  assert.equal(state.selectedLayerId, "source-video");
  state = memoryAnatomyReducer(state, { type: "select-layer", id: "my-note" });
  assert.equal(state.playback, "paused");
  assert.equal(state.selectedLayerId, "my-note");
  state = memoryAnatomyReducer(state, { type: "play" });
  state = memoryAnatomyReducer(state, { type: "set-explosion", value: 0.22 });
  assert.equal(state.playback, "paused");
});

test("keyboard adjacency never escapes the seven-layer order", () => {
  assert.equal(adjacentLayerId("source-video", -1), "source-video");
  assert.equal(adjacentLayerId("source-video", 1), "moment-cut");
  assert.equal(adjacentLayerId("emotion", -1), "outfit-map");
  assert.equal(adjacentLayerId("connection", 1), "connection");
});

test("native candidate strengthens pointer lifecycle, wheel authority, keyboard and reduced motion", async () => {
  const component = await readFile(COMPONENT, "utf8");
  const css = await readFile(CSS, "utf8");
  assert.match(component, /onPointerCancel=\{onPointerEnd\}/);
  assert.match(component, /onLostPointerCapture=/);
  assert.match(component, /setPointerCapture/);
  assert.match(component, /releasePointerCapture/);
  assert.match(component, /if \(!spatialAuthority\) return;/);
  assert.match(component, /event\.preventDefault\(\)/);
  assert.match(component, /ArrowDown/);
  assert.match(component, /ArrowRight/);
  assert.match(component, /ArrowUp/);
  assert.match(component, /ArrowLeft/);
  assert.match(component, /prefers-reduced-motion: reduce/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test("2D and spatial renderers consume the same projected layers and selected state", async () => {
  const component = await readFile(COMPONENT, "utf8");
  assert.ok((component.match(/layers\.map/g) ?? []).length >= 2, "both renderers must map the one layer projection");
  assert.ok((component.match(/state\.selectedLayerId/g) ?? []).length >= 2, "both renderers must consume the one selected-layer authority");
});

test("synthetic fixture contains no source demo confidence percentages", () => {
  const text = JSON.stringify(projectMomentToMemoryAnatomy(SYNTHETIC_MEMORY_FIXTURE));
  assert.doesNotMatch(text, /98\.6|84%|identity match|route strength/i);
  assert.ok(projectMomentToMemoryAnatomy(SYNTHETIC_MEMORY_FIXTURE).every((layer) => layer.synthetic));
});
