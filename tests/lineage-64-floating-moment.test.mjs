import assert from "node:assert/strict";
import test from "node:test";

import { DESIGN_LINEAGES, validateDesignLineages } from "../lib/design-lineages.ts";
import {
  LINEAGE_64_SOURCE,
  LINEAGE_64_PRODUCT_POLICY,
  TRACK64_GESTURE,
  TRACK64_MOMENTS,
  TRACK64_V1_2_1_HANDOFF,
  track64DepthSplit,
  track64FamilySplit,
  track64MediaMix,
} from "../lib/lineage-64/data.ts";
import { SOURCE64_SOURCE_SLOTS } from "../lib/lineage-64/source-slots.ts";
import { toLineage64Moments } from "../lib/lineage-64/product-adapter.ts";
import {
  beginGesture,
  cancelGesture,
  createPendingGesture,
  endGesture,
  moveGesture,
  recoverLostPointerCapture,
  reduceFloatingMoment,
  shouldOpenViewerOnPointerUp,
} from "../lib/lineage-64/state.ts";

test("Lineage 64 registers V1.2.1 candidate without canonical /v4 adoption", () => {
  const lineage = DESIGN_LINEAGES.find((item) => item.number === 64);
  assert.ok(lineage);
  assert.equal(lineage.id, "lt-64-floating-moment-entry-portal");
  assert.deepEqual(lineage.scenarios, ["entry-onboarding"]);
  assert.equal(lineage.revisions.find((r) => r.id === "64-v1-floating-moment-entry-portal")?.decision, "reference");
  const current = lineage.revisions.find((r) => r.id === "64-v1-2-1-floating-moment-entry-portal");
  assert.equal(current?.decision, "candidate");
  assert.equal(current?.route, "/design-lab/lineages/64/v1-2-1");
  assert.equal(validateDesignLineages().length, 0);
});

test("source fingerprint matches the pinned V1.2.1 executable", () => {
  assert.equal(LINEAGE_64_SOURCE.revisionId, "64-v1-2-1");
  assert.equal(LINEAGE_64_SOURCE.executableBytes, 1_565_313);
  assert.equal(
    LINEAGE_64_SOURCE.executableSha256,
    "80886540bb8e3148a7336bf9999298897ac0ab921797a6534c89ea0029c6de5d",
  );
  assert.equal(LINEAGE_64_SOURCE.renderingTier, "css3d-dom");
  assert.equal(LINEAGE_64_SOURCE.route, "/design-lab/lineages/64/v1-2-1");
  assert.equal(LINEAGE_64_SOURCE.executableDriveId, "1UX9OdJrl2HLBIssRzx7cooCBMebe9j2g");
});

test("40 Moment world keeps the Photo18 / Video10 / Memo7 / Link5 media mix", () => {
  assert.equal(TRACK64_MOMENTS.length, 40);
  const mix = track64MediaMix();
  assert.deepEqual(mix, { photo: 18, video: 10, memo: 7, link: 5 });
  const split = track64DepthSplit();
  assert.equal(split.foreground + split.mid + split.far, 40);
  const families = track64FamilySplit();
  assert.deepEqual(Object.values(families), [8, 8, 8, 8, 8]);
});

test("Phase 1 preserves original A media mapping and memo-only surfaces", () => {
  assert.equal(SOURCE64_SOURCE_SLOTS.length, 40);
  assert.equal(SOURCE64_SOURCE_SLOTS.filter((slot) => slot.mediaUrl).length, 33);
  assert.equal(SOURCE64_SOURCE_SLOTS.filter((slot) => slot.kind === "memo").length, 7);
  assert.equal(SOURCE64_SOURCE_SLOTS.filter((slot) => slot.kind === "memo" && !slot.mediaUrl).length, 7);
  for (const slot of SOURCE64_SOURCE_SLOTS.filter((item) => item.kind !== "memo")) {
    assert.match(slot.mediaUrl ?? "", /^\/reference\/lineage-64-source\/m\d+\.(?:webp|jpg)$/);
    assert.match(slot.mediaSha256 ?? "", /^[a-f0-9]{64}$/);
  }
});

test("canonical moments reuse Source64 presentation slots without independent orbit recomputation", () => {
  const canonical = SOURCE64_SOURCE_SLOTS.map((slot, index) => ({
    id: `canonical-${index + 1}`,
    treeId: "tree",
    parentId: index ? `canonical-${index}` : null,
    connectionReason: null,
    title: slot.title,
    memo: slot.memo,
    sourceType: slot.kind,
    thumbnail: slot.kind === "memo" ? "" : "https://example.invalid/canonical.png",
    emotionTags: [],
    timestamp: slot.date,
    discoveryDate: slot.date,
    sortOrder: index + 1,
    isRoot: index === 0,
    depth: index,
    createdAt: null,
  }));
  const projected = toLineage64Moments(canonical);
  assert.equal(projected.length, SOURCE64_SOURCE_SLOTS.length);
  projected.forEach((moment, index) => {
    const slot = SOURCE64_SOURCE_SLOTS[index];
    assert.equal(moment.family, slot.family);
    assert.equal(moment.depthTier, slot.depthTier);
    assert.deepEqual(moment.world, slot.world);
  });
});

test("every Moment carries stable world coordinates and per-Moment fitting metadata", () => {
  for (const m of TRACK64_MOMENTS) {
    assert.ok(Number.isFinite(m.world.angle));
    assert.ok(Number.isFinite(m.world.radius));
    assert.ok(Number.isFinite(m.world.y));
    assert.ok(Number.isFinite(m.world.scale));
    assert.ok(m.fitting.mediaType && m.fitting.fitMode && m.fitting.objectPosition);
    assert.ok(m.fitting.focalPoint && m.fitting.viewerFitMode && m.fitting.viewerObjectPosition);
  }
  // per-Moment diversity: not every photo uses uniform cover
  const photoFitModes = new Set(TRACK64_MOMENTS.filter((m) => m.kind === "photo").map((m) => m.fitting.fitMode));
  assert.ok(photoFitModes.has("cover") && photoFitModes.has("contain"));
});

test("one selected Moment authority is shared by card / focus / viewer / path / branch / list", () => {
  let state = reduceFloatingMoment(
    { selectedMomentId: null, viewerOpen: false, focusedIndex: 0 },
    { type: "select", momentId: "moment-03" },
  );
  assert.equal(state.selectedMomentId, "moment-03");

  state = reduceFloatingMoment(state, { type: "open-viewer", momentId: "moment-03" });
  assert.equal(state.selectedMomentId, "moment-03");
  assert.equal(state.viewerOpen, true);

  state = reduceFloatingMoment(state, { type: "step", delta: 1 });
  assert.equal(state.selectedMomentId, "moment-03");
  assert.equal(state.focusedIndex, 1);

  // close keeps the selected Moment as the visual authority (no parallel selected state)
  state = reduceFloatingMoment(state, { type: "close-viewer" });
  assert.equal(state.viewerOpen, false);
  assert.equal(state.selectedMomentId, "moment-03");
});

test("direct tap/click opens the Viewer; drag/swipe above threshold does not", () => {
  const openCheck = (movement, threshold, downCardId, viewerOpen = false) =>
    shouldOpenViewerOnPointerUp({ movement, threshold, downCardId, viewerOpen });

  assert.equal(openCheck(4, TRACK64_GESTURE.desktopTapThreshold, "moment-01"), true);
  assert.equal(openCheck(9, TRACK64_GESTURE.desktopTapThreshold, "moment-01"), true);
  assert.equal(openCheck(11, TRACK64_GESTURE.desktopTapThreshold, "moment-01"), false);
  assert.equal(openCheck(13, TRACK64_GESTURE.mobileTapThreshold, "moment-01"), true);
  assert.equal(openCheck(15, TRACK64_GESTURE.mobileTapThreshold, "moment-01"), false);
  assert.equal(openCheck(2, TRACK64_GESTURE.desktopTapThreshold, null), false);
  assert.equal(openCheck(2, TRACK64_GESTURE.desktopTapThreshold, "moment-01", true), false);
});

test("endGesture opens only on a tap and always clears pending ownership", () => {
  let pending = beginGesture(createPendingGesture(), 1, "moment-07", 100, 100);
  pending = moveGesture(pending, 104, 102, TRACK64_GESTURE.desktopTapThreshold); // 4px movement = tap
  const tap = endGesture(pending, TRACK64_GESTURE.desktopTapThreshold, false);
  assert.equal(tap.open, true);
  assert.equal(tap.next.downCardId, null);
  assert.equal(tap.next.pointerId, null);

  pending = beginGesture(createPendingGesture(), 2, "moment-08", 100, 100);
  pending = moveGesture(pending, 140, 110, TRACK64_GESTURE.desktopTapThreshold); // drag
  const drag = endGesture(pending, TRACK64_GESTURE.desktopTapThreshold, false);
  assert.equal(drag.open, false);
});

test("pointercancel and lostpointercapture recover without opening or sticking", () => {
  let pending = beginGesture(createPendingGesture(), 3, "moment-09", 50, 50);
  pending = moveGesture(pending, 70, 60, TRACK64_GESTURE.desktopTapThreshold);
  const afterCancel = cancelGesture(pending);
  assert.equal(afterCancel.downCardId, null);
  assert.equal(afterCancel.pointerId, null);
  assert.equal(
    shouldOpenViewerOnPointerUp({ movement: 0, threshold: 10, downCardId: afterCancel.downCardId, viewerOpen: false }),
    false,
  );

  let pending2 = beginGesture(createPendingGesture(), 4, "moment-10", 50, 50);
  pending2 = moveGesture(pending2, 90, 55, TRACK64_GESTURE.desktopTapThreshold);
  const recovered = recoverLostPointerCapture(pending2);
  assert.equal(recovered.downCardId, null);
  assert.equal(recovered.dragActive, false);
  assert.equal(
    shouldOpenViewerOnPointerUp({ movement: 0, threshold: 10, downCardId: recovered.downCardId, viewerOpen: false }),
    false,
  );
});

test("recent / important / resume remain product policy, never canonical truth", () => {
  assert.equal(LINEAGE_64_PRODUCT_POLICY.canonical, false);
  assert.deepEqual(
    [...LINEAGE_64_PRODUCT_POLICY.fields].sort(),
    ["important", "lastViewed", "myTreeRoute", "recent", "resume", "signedInReturn"].sort(),
  );
  // demo flags exist on fixtures but are explicitly non-canonical markers
  assert.ok(TRACK64_MOMENTS.some((m) => m.demoRecent));
  assert.ok(TRACK64_MOMENTS.some((m) => m.demoImportant));
});

test("no fake external Link URL is invented when the source URL is absent", () => {
  const links = TRACK64_MOMENTS.filter((m) => m.kind === "link");
  assert.equal(links.length, 5);
  for (const link of links) assert.equal(link.externalUrl, undefined);
});

test("Track59 handoff keeps mapping proven but actual open / receive unproven", () => {
  assert.equal(TRACK64_V1_2_1_HANDOFF.sourceTrackId, "Track59");
  assert.equal(TRACK64_V1_2_1_HANDOFF.targetMapping, true);
  assert.equal(TRACK64_V1_2_1_HANDOFF.actualTargetOpen, false);
  assert.equal(TRACK64_V1_2_1_HANDOFF.receiverConsume, false);
  assert.equal(TRACK64_V1_2_1_HANDOFF.sameMomentFocus, false);
});
