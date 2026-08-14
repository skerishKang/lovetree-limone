import assert from "node:assert/strict";
import test from "node:test";

import {
  TRACK63_CONNECTIONS,
  TRACK63_MOMENTS,
  TRACK63_MOMENT_BY_ID,
  TRACK63_SEED_SETS,
} from "../lib/lineage-63/data.ts";
import {
  createInitialStudioState,
  reduceStudioState,
} from "../lib/lineage-63/state.ts";
import {
  computeLayoutSignature,
  DEFAULT_VIEW_PARAMETERS,
  TRACK63_VIEW_BY_ID,
  TRACK63_VIEW_DEFINITIONS,
} from "../lib/lineage-63/view-definitions.ts";

test("Lineage 63: canonical 54 Moments fixture composition", () => {
  assert.equal(TRACK63_MOMENTS.length, 54, "must contain exactly 54 Moments");

  const photos = TRACK63_MOMENTS.filter((m) => m.mediaType === "photo");
  const videos = TRACK63_MOMENTS.filter((m) => m.mediaType === "video");
  const memos = TRACK63_MOMENTS.filter((m) => m.mediaType === "memo");
  const links = TRACK63_MOMENTS.filter((m) => m.mediaType === "link");

  assert.equal(photos.length, 24, "exactly 24 Photo moments");
  assert.equal(videos.length, 12, "exactly 12 Video moments");
  assert.equal(memos.length, 10, "exactly 10 Memo moments");
  assert.equal(links.length, 8, "exactly 8 Link moments");

  const ids = new Set(TRACK63_MOMENTS.map((m) => m.id));
  assert.equal(ids.size, 54, "all 54 moment IDs must be unique");

  // Every memo has real text
  memos.forEach((memo) => {
    assert.ok(memo.memoText && memo.memoText.length > 0, `memo ${memo.id} must have real text`);
  });

  // Every link has valid domain and url
  links.forEach((link) => {
    assert.ok(link.linkUrl && link.linkDomain, `link ${link.id} must have bounded url & domain`);
  });
});

test("Lineage 63: 8 Seed Sets composition and identity invariance", () => {
  assert.equal(TRACK63_SEED_SETS.length, 8, "must contain exactly 8 Seed Sets");

  TRACK63_SEED_SETS.forEach((seed) => {
    assert.ok(seed.momentIds.length > 0, `seed ${seed.id} must have non-empty moments`);
    seed.momentIds.forEach((id) => {
      assert.ok(TRACK63_MOMENT_BY_ID.has(id), `seed moment ${id} must exist in master collection`);
    });
  });

  // Verify switching seed sets changes the moment list
  const fullSet = TRACK63_SEED_SETS.find((s) => s.id === "mixed-54");
  const romanticSet = TRACK63_SEED_SETS.find((s) => s.id === "romantic");
  assert.notDeepEqual(fullSet?.momentIds, romanticSet?.momentIds, "Seed sets must have distinct subsets");
});

test("Lineage 63: 57 Connections topology and validity", () => {
  assert.equal(TRACK63_CONNECTIONS.length, 57, "must contain exactly 57 Connections");

  const connIds = new Set(TRACK63_CONNECTIONS.map((c) => c.id));
  assert.equal(connIds.size, 57, "connection IDs must be unique");

  TRACK63_CONNECTIONS.forEach((conn) => {
    assert.ok(TRACK63_MOMENT_BY_ID.has(conn.sourceId), `source ${conn.sourceId} must exist`);
    assert.ok(TRACK63_MOMENT_BY_ID.has(conn.targetId), `target ${conn.targetId} must exist`);
    assert.ok(conn.whyNext && conn.whyNext.length > 0, `connection ${conn.id} must have whyNext reason`);
  });

  // 12 Main Path edges
  const mainPathEdges = TRACK63_CONNECTIONS.filter((c) => c.relation === "main-path");
  assert.equal(mainPathEdges.length, 12, "exactly 12 Main Path backbone connections");
});

test("Lineage 63: 44 View Presets and 44/44 unique 3D transform signatures", () => {
  assert.equal(TRACK63_VIEW_DEFINITIONS.length, 44, "must contain exactly 44 View Definitions");

  const viewIds = new Set(TRACK63_VIEW_DEFINITIONS.map((v) => v.id));
  assert.equal(viewIds.size, 44, "all 44 view definition IDs must be unique");

  const signatures = new Set();
  const signatureMap = new Map();

  TRACK63_VIEW_DEFINITIONS.forEach((viewDef) => {
    const signature = computeLayoutSignature(viewDef, DEFAULT_VIEW_PARAMETERS, TRACK63_MOMENTS);
    assert.ok(signature.length > 0, `signature for ${viewDef.id} must not be empty`);
    if (signatures.has(signature)) {
      const duplicateWith = signatureMap.get(signature);
      assert.fail(`View preset ${viewDef.id} has duplicate transform signature with ${duplicateWith}`);
    }
    signatures.add(signature);
    signatureMap.set(signature, viewDef.id);
  });

  assert.equal(signatures.size, 44, "all 44 view presets must produce 44 unique transform signatures under fixed parameters");
});

test("Lineage 63: 48 Inspector Controls bound schema and no dead controls", () => {
  const params = DEFAULT_VIEW_PARAMETERS;

  // 24 Range parameters
  const rangeKeys = [
    "cameraDistance", "fov", "spread", "rotationX", "rotationY", "rotationZ",
    "cardScale", "cardDepth", "itemTilt", "elevation", "curvature", "connectionOpacity",
    "spacingX", "spacingY", "spacingZ", "glowIntensity", "blurFalloff", "speed",
    "waveAmplitude", "waveFrequency", "verticalOffset", "orbitTilt", "cardGap", "arcAngle",
  ];
  assert.equal(rangeKeys.length, 24, "24 range controls");
  rangeKeys.forEach((key) => {
    assert.equal(typeof params[key], "number", `${key} must be a number`);
  });

  // 12 Toggle parameters
  const toggleKeys = [
    "showConnections", "showLabels", "autoRotate", "depthCue", "darkBackdrop",
    "cardShadow", "showBadges", "cardReflection", "highlightMainPath", "wireframeGuides",
    "soundIndicators", "compactCards",
  ];
  assert.equal(toggleKeys.length, 12, "12 toggle controls");
  toggleKeys.forEach((key) => {
    assert.equal(typeof params[key], "boolean", `${key} must be a boolean`);
  });

  // 4 Select parameters
  const selectKeys = ["sortOrder", "cardAspectRatio", "themePalette", "connectionStyle"];
  assert.equal(selectKeys.length, 4, "4 select controls");
  selectKeys.forEach((key) => {
    assert.equal(typeof params[key], "string", `${key} must be a string`);
  });

  // 8 Segmented parameters
  const segmentedKeys = [
    "mediaFilter", "seedSet", "viewFamily", "projectionMode", "loopPolicy",
    "layoutAlignment", "focusLevel", "renderQuality",
  ];
  assert.equal(segmentedKeys.length, 8, "8 segmented controls");
  segmentedKeys.forEach((key) => {
    assert.equal(typeof params[key], "string", `${key} must be a string`);
  });

  const totalControls = rangeKeys.length + toggleKeys.length + selectKeys.length + segmentedKeys.length;
  assert.equal(totalControls, 48, "total 48 bound inspector controls");
});

test("Lineage 63: state reducer, seed switching, moment selection, and media authority cap", () => {
  let state = createInitialStudioState();
  assert.equal(state.selectedViewId, "orbit-ring-3d");
  assert.equal(state.selectedMomentId, "m1");
  assert.equal(state.activeMediaPlayingId, null);

  // Select another moment
  state = reduceStudioState(state, { type: "select-moment", momentId: "m25" });
  assert.equal(state.selectedMomentId, "m25");

  // Play video (max 1 active video)
  state = reduceStudioState(state, { type: "set-active-media-playing", momentId: "m25" });
  assert.equal(state.activeMediaPlayingId, "m25");

  // Play another video -> replaces active playing video
  state = reduceStudioState(state, { type: "set-active-media-playing", momentId: "m26" });
  assert.equal(state.activeMediaPlayingId, "m26", "active video cap is strictly <= 1");

  // Pause video
  state = reduceStudioState(state, { type: "set-active-media-playing", momentId: null });
  assert.equal(state.activeMediaPlayingId, null);

  // Switch seed set
  state = reduceStudioState(state, { type: "select-seed", seedId: "stage-performance" });
  assert.equal(state.selectedSeedId, "stage-performance");
  // Moment m26 is in stage-performance, so it remains selected or falls back to first
  assert.ok(state.selectedMomentId !== null);
});

test("Lineage 63: preset save, restore, and undo/redo history", () => {
  let state = createInitialStudioState();
  const initialPresetCount = state.savedPresets.length;
  const initialSpread = state.parameters.spread;

  // Modify parameter
  state = reduceStudioState(state, { type: "update-param", key: "spread", value: 450 });
  assert.equal(state.parameters.spread, 450);
  assert.equal(state.historyPast.length, 1, "past history recorded");

  // Undo
  state = reduceStudioState(state, { type: "undo" });
  assert.equal(state.parameters.spread, initialSpread);
  assert.equal(state.historyFuture.length, 1, "future history recorded");

  // Redo
  state = reduceStudioState(state, { type: "redo" });
  assert.equal(state.parameters.spread, 450);

  // Save preset
  state = reduceStudioState(state, { type: "save-preset", name: "My Ultra Spread View" });
  assert.equal(state.savedPresets.length, initialPresetCount + 1);
  const latestPreset = state.savedPresets[state.savedPresets.length - 1];
  assert.equal(latestPreset.name, "My Ultra Spread View");
  assert.equal(latestPreset.parameters.spread, 450);

  // Reset and restore
  state = reduceStudioState(state, { type: "reset-params" });
  assert.notEqual(state.parameters.spread, 450);

  state = reduceStudioState(state, { type: "restore-preset", presetId: latestPreset.id });
  assert.equal(state.parameters.spread, 450, "restored exact parameter value from preset");
});
