import assert from "node:assert/strict";
import test from "node:test";

import {
  TRACK62_V11_SCENE_COUNT,
  TRACK62_V11_SOURCE,
  createTrack62SaveState,
  exhibitionModel,
  momentById,
  saveMoment,
  syntheticTrack62Moments,
} from "../lib/track-62-v11/data.ts";

test("data variance: 3 / 7 / 11 scene fixtures are coherent", () => {
  for (const count of [3, 7, 11]) {
    const moments = syntheticTrack62Moments(count);
    assert.equal(moments.length, count);
    const ids = new Set(moments.map((moment) => moment.id));
    assert.equal(ids.size, count, "scene ids must be unique per fixture");
    for (const moment of moments) {
      assert.ok(moment.title.length > 0);
      assert.ok(moment.note.length > 0);
      assert.ok(moment.whyNext.includes("WHY NEXT"));
      assert.equal(moment.mediaAuthority, "DEMO_PREVIEW");
    }
  }
  assert.throws(() => syntheticTrack62Moments(1), TypeError);
  assert.throws(() => syntheticTrack62Moments(Number.NaN), TypeError);
});

test("momentById resolves and misses safely", () => {
  const moments = syntheticTrack62Moments(7);
  assert.equal(momentById(moments, moments[2].id)?.railNumber, "03");
  assert.equal(momentById(moments, "does-not-exist"), null);
});

for (const count of [3, 7, 11]) {
  test(`exhibitionModel(${count} scenes): single-authority derivation`, () => {
    const moments = syntheticTrack62Moments(count);
    const last = moments[count - 1];
    const model = exhibitionModel(moments, last.id);
    assert.equal(model.scenes, count);
    assert.equal(model.activeSceneIndex, count - 1);
    assert.equal(model.momentIds.length, count);
    assert.equal(model.moment?.id, last.id);
    // Journal is derived from the SAME momentId progression — one authority.
    assert.equal(model.journal.length, count);
    assert.equal(model.journal[count - 1].momentId, last.id);
    for (let index = 0; index < count; index += 1) {
      assert.equal(model.journal[index].sceneIndex, index);
    }
    assert.equal(model.myTreeHandoff, "HOLD_INTERNAL_SUMMARY");
  });
}

test("exhibitionModel: unknown id falls back to the first scene, never null for a non-empty fixture", () => {
  const moments = syntheticTrack62Moments(7);
  const model = exhibitionModel(moments, "no-such-moment");
  assert.equal(model.activeSceneIndex, 0);
  assert.equal(model.moment?.id, moments[0].id);
});

test("SAVE boundary: prototype state only, idempotent", () => {
  let state = createTrack62SaveState();
  assert.deepEqual(state.savedMomentIds, []);
  state = saveMoment(state, "mom-03-cafe-talk");
  state = saveMoment(state, "mom-03-cafe-talk");
  assert.deepEqual(state.savedMomentIds, ["mom-03-cafe-talk"]);
  assert.equal(state.lastSaveBoundary, "PROTOTYPE_STATE_ONLY");
});

test("source provenance truth: pinned manifest values, no false EXACT claims", () => {
  assert.equal(TRACK62_V11_SOURCE.bytes, 20728647);
  assert.equal(
    TRACK62_V11_SOURCE.sha256,
    "bc5484a1c545165feb57cd76cae49c8f1e7bb0b3f4a0e11fa9bc4e739a6987e8",
  );
  assert.equal(TRACK62_V11_SOURCE.lineageReservation, "HOLD");
  assert.equal(TRACK62_V11_SOURCE.canonicalAdoption, "NO");
  assert.equal(TRACK62_V11_SOURCE.sourceAssetsForProof, "SOURCE_REFERENCE_ONLY");
  assert.equal(TRACK62_V11_SOURCE.productionMedia, "PRODUCTION_MEDIA_HOLD");
  assert.equal(TRACK62_V11_SCENE_COUNT, 7);
});
