import test from "node:test";
import assert from "node:assert/strict";

import {
  V24_CHUNK_RAW,
  V24_CHUNK_TRIGGER,
  V24_OVERLAP,
  V24_COMMITTED_PER_BAKE,
  V24_TRAVEL_MAX,
  V24_RIBBON_HEIGHT,
  computeQ,
  qMatchesTravel,
  clampTravel,
  v24InitState,
  v24MakeSample,
  v24AppendSample,
  v24RecordHistory,
  v24RewindTo,
  v24RewindStep,
  v24BakeChunk,
  v24RayFromPointer,
  v24RibbonHitTest,
} from "../lib/lineage-67-v24/engine.ts";
import {
  LINEAGE_67_V24_SOURCE,
  LINEAGE_67_V24_WORKS_ASSIGNABLE,
  LINEAGE_67_V24_WORKS_V242_OWNER_SET,
  worksLedgerHasNoFabricatedHref,
} from "../lib/lineage-67-v24/source.ts";

// Drive a straight-line trajectory so chunks bake deterministically.
function straightStep(s, dx, dz) {
  const travel = clampTravel(s.travel + 1);
  const np = [s.pos[0] + dx, s.pos[1], s.pos[2] + dz];
  const sample = v24MakeSample({
    order: s.nextOrder,
    travel,
    x: np[0],
    y: np[1],
    z: np[2],
    spin: s.spin + 0.01,
    dir: [dx, 0, dz],
  });
  let next = v24AppendSample(s, sample);
  next = v24RecordHistory(next);
  return next;
}

test("V2.4.2 exact-source fingerprint matches committed asset", () => {
  assert.equal(LINEAGE_67_V24_SOURCE.sourceBytes, 12265511);
  assert.equal(
    LINEAGE_67_V24_SOURCE.sourceSha256,
    "85210be6a3368edd8e5e2d55c94721d91cd031c2cabca1c6698ffabf1e65ae6f",
  );
  assert.equal(LINEAGE_67_V24_SOURCE.rendering, "RAW_WEBGL2_CUSTOM_WEBGL");
});

// ---- BLOCKER 1: static chunk persistence (112 is samples-per-bake, not a cap) ----
test("A. static chunks exceed 112 without evicting the oldest chunk", () => {
  let s = v24InitState();
  for (let i = 0; i < V24_CHUNK_TRIGGER * 210; i += 1) {
    s = straightStep(s, 1, 0);
  }
  assert.ok(s.chunks.length > 112, `expected >112 chunks, got ${s.chunks.length}`);
  assert.equal(s.chunks[0].id, 1);
  assert.equal(s.chunks[0].order, 1);
  assert.ok(s.raw.length < V24_CHUNK_TRIGGER, `raw tail not bounded: ${s.raw.length}`);
});

test("A2. after >112 chunks the earliest ribbon remains resident (long-path)", () => {
  let s = v24InitState();
  for (let i = 0; i < V24_CHUNK_TRIGGER * 300; i += 1) {
    s = straightStep(s, 1, 0);
  }
  assert.ok(s.chunks.length > 112);
  const first = s.chunks[0];
  assert.ok(first.samples.length >= V24_OVERLAP);
  assert.equal(first.id, 1);
});

test("1b. CHUNK_RAW is a bake-quantity constant, not a chunk count cap", () => {
  assert.equal(V24_CHUNK_RAW, 112);
  assert.equal(V24_CHUNK_TRIGGER, 120);
  assert.equal(V24_COMMITTED_PER_BAKE, 108);
});

// ---- BLOCKER 2: bake semantics / active tail (no invented TAIL_MAX=220) ----
test("B. bake triggers at 120, bakes 112 raw, leaves a residual active tail", () => {
  let s = v24InitState();
  let bakedAt = -1;
  for (let i = 0; i < V24_CHUNK_TRIGGER + 5; i += 1) {
    const before = s.chunks.length;
    s = straightStep(s, 1, 0);
    if (s.chunks.length > before && bakedAt < 0) bakedAt = i;
  }
  assert.ok(bakedAt >= 0, "a chunk should bake");
  assert.ok(bakedAt <= V24_CHUNK_TRIGGER, `bake should trigger near ${V24_CHUNK_TRIGGER}`);
  assert.equal(s.chunks[0].samples.length, V24_CHUNK_RAW);
  assert.equal(s.chunks[0].committed, V24_COMMITTED_PER_BAKE);
  assert.ok(s.raw.length > 0 && s.raw.length < V24_CHUNK_TRIGGER, `residual tail bad: ${s.raw.length}`);
  if (s.chunks[0].samples.length >= V24_OVERLAP) {
    const lastBaked = s.chunks[0].samples[V24_CHUNK_RAW - V24_OVERLAP];
    assert.equal(s.raw[0].order, lastBaked.order);
  }
});

test("2b. v24BakeChunk removes only (112 - overlap) raw, keeping overlap continuity", () => {
  const raw = [];
  for (let i = 0; i < V24_CHUNK_TRIGGER; i += 1) {
    raw.push(v24MakeSample({ order: i + 1, travel: i, x: i, y: 0, z: 0, spin: 0, dir: [1, 0, 0] }));
  }
  const { chunk, residual } = v24BakeChunk(raw, 1, 1);
  assert.equal(chunk.samples.length, V24_CHUNK_RAW);
  assert.equal(residual.length, V24_CHUNK_TRIGGER - (V24_CHUNK_RAW - V24_OVERLAP));
  assert.equal(residual[0].order, raw[V24_CHUNK_RAW - V24_OVERLAP].order);
});

// ---- BLOCKER 3: full-state rewind to origin ----
test("D. full-state rewind restores pos/spin/dir/travel and reaches origin", () => {
  let s = v24InitState();
  for (let i = 0; i < V24_CHUNK_TRIGGER * 60; i += 1) {
    s = straightStep(s, 1, 0);
  }
  const fwdTravel = s.travel;
  const fwdPos = [...s.pos];
  const fwdSpin = s.spin;

  const midTarget = Math.floor(fwdTravel / 2);
  const r = v24RewindTo(s, midTarget);
  const rec = s.history.find((h) => h.travel === r.travel);
  assert.ok(rec, "rewind target should map to a recorded state");
  assert.equal(r.travel, rec.travel);
  assert.deepEqual([r.pos[0], r.pos[1], r.pos[2]], [rec.pos[0], rec.pos[1], rec.pos[2]]);
  assert.equal(r.spin, rec.spin);
  assert.ok(r.chunks.length <= s.chunks.length);
  assert.equal(r.chunks.length, rec.visibleChunkCount);

  const origin = v24RewindTo(s, 0);
  assert.equal(origin.travel, 0);
  assert.deepEqual([origin.pos[0], origin.pos[1], origin.pos[2]], [0, 1.5, 0]);
  assert.equal(origin.chunks.length, 0);
  assert.equal(origin.raw.length, 0);
  assert.notEqual(fwdTravel, 0);
  assert.notDeepEqual(fwdPos, [0, 1.5, 0]);
  assert.notEqual(fwdSpin, 0);
});

test("D2. rewind steps backward one record at a time and stops at origin", () => {
  let s = v24InitState();
  for (let i = 0; i < V24_CHUNK_TRIGGER * 30; i += 1) {
    s = straightStep(s, 1, 0);
  }
  let prevTravel = s.travel;
  for (let i = 0; i < s.history.length + 2; i += 1) {
    s = v24RewindStep(s);
    assert.ok(s.travel <= prevTravel + 1e-9, "rewind must not move forward");
    prevTravel = s.travel;
  }
  assert.equal(s.travel, 0);
});

// ---- BLOCKER 4: actual pointer ray / surface hit ----
function buildTwoChunkState() {
  let s = v24InitState();
  for (let i = 0; i < V24_CHUNK_TRIGGER; i += 1) {
    const x = 10 + i;
    s = v24AppendSample(s, v24MakeSample({ order: s.nextOrder, travel: i, x, y: 0, z: 0, spin: 0, dir: [1, 0, 0] }));
  }
  for (let i = 0; i < V24_CHUNK_TRIGGER; i += 1) {
    const x = 200 + i;
    s = v24AppendSample(s, v24MakeSample({ order: s.nextOrder, travel: 1000 + i, x, y: 0, z: 0, spin: 0, dir: [1, 0, 0] }));
  }
  return { s, nearChunk: s.chunks[0].id, farChunk: s.chunks[1].id };
}

test("E. ray through a ribbon selects the intersected chunk (triangle hit)", () => {
  const { s, nearChunk } = buildTwoChunkState();
  // angled ray that pierces the z=0 ribbon wall (avoids coplanar degeneracy)
  const eye = [0, 5, -10];
  const ray = v24RayFromPointer(0, 0, eye, [1, 0, 1], Math.PI / 3.2, 1.5);
  const hit = v24RibbonHitTest(ray, s.chunks, V24_RIBBON_HEIGHT);
  assert.ok(hit, "expected a hit through the ribbon");
  assert.equal(hit.chunkId, nearChunk);
});

test("E2. empty-space / AABB-miss ray returns null (negative proof)", () => {
  const { s } = buildTwoChunkState();
  const away = v24RayFromPointer(0, 0, [0, 5, 0], [-1, 0, 0], Math.PI / 3.2, 1.5);
  assert.equal(v24RibbonHitTest(away, s.chunks, V24_RIBBON_HEIGHT), null);
  const up = v24RayFromPointer(0, 1, [0, 5, 0], [0, 1, 0], Math.PI / 3.2, 1.5);
  assert.equal(v24RibbonHitTest(up, s.chunks, V24_RIBBON_HEIGHT), null);
});

test("E3. overlapping/cross-chunk surfaces select the frontmost (nearest t)", () => {
  const { s, nearChunk, farChunk } = buildTwoChunkState();
  const eye = [0, 5, -10];
  const ray = v24RayFromPointer(0, 0, eye, [1, 0, 1], Math.PI / 3.2, 1.5);
  const hit = v24RibbonHitTest(ray, s.chunks, V24_RIBBON_HEIGHT);
  assert.ok(hit);
  assert.equal(hit.chunkId, nearChunk);
  assert.notEqual(hit.chunkId, farChunk);
});

test("E4. empty chunks list yields null hit (no fabricated inspect)", () => {
  const eye = [0, 5, 0];
  const ray = v24RayFromPointer(0, 0, eye, [1, 0, 0], Math.PI / 3.2, 1.5);
  assert.equal(v24RibbonHitTest(ray, [], V24_RIBBON_HEIGHT), null);
});

// ---- shared continuity / WORKS ledger ----
test("q/travel print continuity q === travel + 0.58", () => {
  for (const t of [0, 99.14757856409034, 216.20272050159915, 5000]) {
    assert.ok(qMatchesTravel(computeQ(t), t));
    assert.equal(computeQ(t), t + 0.58);
  }
});

test("travel clamps to [0, V24_TRAVEL_MAX]", () => {
  assert.equal(clampTravel(-5), 0);
  assert.equal(clampTravel(100), 100);
  const maxed = clampTravel(999999);
  assert.equal(maxed, V24_TRAVEL_MAX);
  assert.equal(clampTravel(0), 0);
  assert.equal(Number.isFinite(clampTravel(50)), true);
});

test("assignable WORKS ledger never fabricates an href for HOLD targets", () => {
  assert.ok(worksLedgerHasNoFabricatedHref(LINEAGE_67_V24_WORKS_ASSIGNABLE));
  const holds = LINEAGE_67_V24_WORKS_ASSIGNABLE.filter((t) => t.status === "HOLD");
  for (const h of holds) assert.equal(h.href, null);
  const byId = Object.fromEntries(LINEAGE_67_V24_WORKS_ASSIGNABLE.map((t) => [t.id, t]));
  assert.equal(byId["66"].href, "/v4/journey?v12=1");
  assert.equal(byId["64"].href, "/design-lab/lineages/64/v1-2-1");
  assert.equal(byId["61"].href, "/design-lab/lineages/61/61-v1-9");
});

test("V2.4.2 owner WORKS set never fabricates an href", () => {
  assert.ok(worksLedgerHasNoFabricatedHref(LINEAGE_67_V24_WORKS_V242_OWNER_SET));
  const ids = LINEAGE_67_V24_WORKS_V242_OWNER_SET.map((t) => t.id);
  assert.ok(!ids.includes("61"));
  assert.ok(!ids.includes("60"));
  const t13 = LINEAGE_67_V24_WORKS_V242_OWNER_SET.find((t) => t.id === "13");
  assert.equal(t13?.status, "HOLD");
  assert.equal(t13?.href, null);
});
