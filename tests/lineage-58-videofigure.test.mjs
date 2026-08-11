import assert from "node:assert/strict";
import test from "node:test";

import { DESIGN_LINEAGES, validateDesignLineages } from "../lib/design-lineages.ts";
import {
  LINEAGE_58_VIDEOFIGURE_ASSETS,
  LINEAGE_58_VIDEOFIGURE_ASSET_HOLD,
  validateLineage58VideoFigureAssetRegistry,
} from "../lib/lineage-58-videofigure-assets.ts";
import {
  LINEAGE_58_VIDEOFIGURE_SOURCE,
  VIDEOFIGURE_LOOKS,
  VIDEOFIGURE_MOMENTS,
  VIDEOFIGURE_PERSONS,
} from "../lib/lineage-58-videofigure-source.ts";
import {
  VIDEOFIGURE_ANGLES,
  createVideoFigureTurntableState,
  normalizeVideoFigureLookIndex,
  reduceVideoFigureTurntable,
} from "../lib/videofigure-turntable.ts";

test("Lineage 58 registers V1 baseline and V2 current candidate without canonical V4 adoption", () => {
  const lineage = DESIGN_LINEAGES.find((item) => item.number === 58);
  assert.ok(lineage);
  assert.equal(lineage.id, "lt-58-videofigure-atelier");
  assert.deepEqual(lineage.scenarios, ["people-archive"]);
  assert.equal(lineage.revisions.find((revision) => revision.id === "58-v1-videofigure-atelier")?.decision, "baseline");
  assert.equal(lineage.revisions.find((revision) => revision.id === "58-v2-videofigure-atelier")?.decision, "candidate");
  assert.equal(lineage.revisions.find((revision) => revision.id === "58-v2-videofigure-atelier")?.route, "/design-lab/lineages/58/v2");
  assert.equal(validateDesignLineages().length, 0);
});

test("VideoFigure domain projection keeps Person, Moment and DerivedFigure/Look separate", () => {
  assert.equal(VIDEOFIGURE_PERSONS.length, 10);
  assert.equal(VIDEOFIGURE_MOMENTS.length, 10);
  assert.equal(VIDEOFIGURE_LOOKS.length, 10);
  for (const [index, look] of VIDEOFIGURE_LOOKS.entries()) {
    assert.equal(look.personId, VIDEOFIGURE_PERSONS[index].id);
    assert.equal(look.sourceMomentId, VIDEOFIGURE_MOMENTS[index].id);
    assert.equal(look.angleAssets.length, 8);
    assert.deepEqual(look.angleAssets.map((asset) => asset.angle), VIDEOFIGURE_ANGLES);
  }
});

test("80-frame fingerprints stay complete and the exact gate follows explicit binary-transfer status", () => {
  const gate = validateLineage58VideoFigureAssetRegistry();
  assert.equal(LINEAGE_58_VIDEOFIGURE_ASSETS.length, 80);
  assert.equal(gate.expected, 80);
  assert.equal(gate.registered, 80);
  assert.deepEqual(gate.missing, []);
  assert.deepEqual(gate.unexpected, []);
  assert.equal(gate.metadataComplete, 80);
  assert.equal(gate.fingerprintComplete, true);
  assert.ok(["hold", "complete"].includes(gate.binaryTransferStatus));
  assert.equal(gate.exactGatePass, gate.fingerprintComplete && gate.binaryTransferStatus === "complete");
  assert.equal(gate.holdMarker, LINEAGE_58_VIDEOFIGURE_ASSET_HOLD);
  assert.equal(gate.holdMarker, "EXACT_VIDEOFIGURE_ASSET_TRANSFER_HOLD");
});

test("representative exact fingerprints remain pinned", () => {
  const byName = (name) => LINEAGE_58_VIDEOFIGURE_ASSETS.find((asset) => asset.filename === name);
  assert.deepEqual(
    { bytes: byName("A_000.png")?.bytes, width: byName("A_000.png")?.width, height: byName("A_000.png")?.height, sha: byName("A_000.png")?.sha256 },
    { bytes: 85587, width: 378, height: 506, sha: "3d2a75387485ead8a468dd89f0f21cb548b580d70094816b16c15fd2af3dda22" },
  );
  assert.equal(byName("A_090.png")?.sha256, "2f25c7e3d9f41440fe625015cc6a8354afcd365982a856c514f7292e5e725933");
  assert.equal(byName("F_000.png")?.sha256, "635edc36c4db1869c18bfe3c0ab64d9b309e00ca0c60f67b7ee2e3f34503b19c");
  assert.equal(byName("J_315.png")?.sha256, "9cd73e2c1d9cb5119976eb2c4a456fd49be28cda587217b3c5e740bb1c0690ae");
  assert.deepEqual([...new Set(LINEAGE_58_VIDEOFIGURE_ASSETS.map((asset) => `${asset.width}x${asset.height}`))].sort(), ["378x506", "412x464", "412x465"]);
});

test("autoplay completes eight ordered angles before advancing to the next Look", () => {
  const config = { lookCount: 10, resumePolicy: "resume-after-idle" };
  let state = createVideoFigureTurntableState(config);
  assert.equal(state.lookIndex, 0);
  assert.equal(state.angleIndex, 0);
  for (let i = 0; i < 7; i += 1) state = reduceVideoFigureTurntable(state, { type: "auto-tick" }, config);
  assert.equal(state.lookIndex, 0);
  assert.equal(state.angleIndex, 7);
  state = reduceVideoFigureTurntable(state, { type: "auto-tick" }, config);
  assert.equal(state.lookIndex, 1);
  assert.equal(state.angleIndex, 0);
});

test("canonical Look selection wraps safely and resets to the 000-degree authority", () => {
  const config = { lookCount: 10, resumePolicy: "resume-after-idle" };
  assert.equal(normalizeVideoFigureLookIndex(10, 10), 0);
  assert.equal(normalizeVideoFigureLookIndex(-1, 10), 9);
  let state = createVideoFigureTurntableState(config, 9);
  state = reduceVideoFigureTurntable(state, { type: "select-angle", index: 6, manual: true }, config);
  assert.equal(state.angleIndex, 6);
  state = reduceVideoFigureTurntable(state, { type: "select-look", index: 10 }, config);
  assert.equal(state.lookIndex, 0);
  assert.equal(state.angleIndex, 0);
  assert.equal(state.manuallyOwned, true);
});

test("manual authority immediately blocks autoplay and resume-after-idle restores guided transport", () => {
  const config = { lookCount: 10, resumePolicy: "resume-after-idle" };
  let state = createVideoFigureTurntableState(config);
  state = reduceVideoFigureTurntable(state, { type: "manual-start" }, config);
  const owned = state;
  state = reduceVideoFigureTurntable(state, { type: "auto-tick" }, config);
  assert.deepEqual(state, owned);
  state = reduceVideoFigureTurntable(state, { type: "step-angle", delta: 1, manual: true }, config);
  assert.equal(state.angleIndex, 1);
  state = reduceVideoFigureTurntable(state, { type: "manual-end" }, config);
  assert.equal(state.manuallyOwned, false);
  state = reduceVideoFigureTurntable(state, { type: "auto-tick" }, config);
  assert.equal(state.angleIndex, 2);
});

test("source authority remains V1/V2 Drive fingerprints and no real media pipeline is claimed", () => {
  assert.equal(LINEAGE_58_VIDEOFIGURE_SOURCE.v1RuntimeBytes, 30604);
  assert.equal(LINEAGE_58_VIDEOFIGURE_SOURCE.v2RuntimeBytes, 27918);
  assert.equal(LINEAGE_58_VIDEOFIGURE_SOURCE.renderingTier, "sprite-2.5d");
  assert.equal(LINEAGE_58_VIDEOFIGURE_SOURCE.route, "/design-lab/lineages/58/v2");
});
