import test from "node:test";
import assert from "node:assert/strict";

import {
  V24_CHUNK_RAW,
  V24_TAIL_MAX,
  promoteChunk,
  pushTail,
  tailIsBounded,
  computeQ,
  qMatchesTravel,
  clampTravel,
  V24_TRAVEL_MAX,
  rewindStep,
  frontmostHit,
  v24StateSnapshot,
} from "../lib/lineage-67-v24/engine.ts";
import {
  LINEAGE_67_V24_SOURCE,
  LINEAGE_67_V24_WORKS_ASSIGNABLE,
  LINEAGE_67_V24_WORKS_V242_OWNER_SET,
  worksLedgerHasNoFabricatedHref,
} from "../lib/lineage-67-v24/source.ts";

test("V2.4.2 exact-source fingerprint matches committed asset", () => {
  assert.equal(LINEAGE_67_V24_SOURCE.sourceBytes, 12265511);
  assert.equal(
    LINEAGE_67_V24_SOURCE.sourceSha256,
    "85210be6a3368edd8e5e2d55c94721d91cd031c2cabca1c6698ffabf1e65ae6f",
  );
  assert.equal(LINEAGE_67_V24_SOURCE.rendering, "RAW_WEBGL2_CUSTOM_WEBGL");
});

test("chunk promotion respects CHUNK_RAW hard cap", () => {
  let chunks = [];
  let nextId = 1;
  // Many diverse far grid cells: once the list reaches V24_CHUNK_RAW it must
  // never grow beyond it (oldest is dropped, length stays capped).
  for (let i = 0; i < 400; i += 1) {
    const x = (i % 30) * 30 + (i % 7 === 0 ? 0 : 900);
    const z = (i % 23) * 30 + (i % 5 === 0 ? 0 : 900);
    const r = promoteChunk(chunks, nextId, x, z);
    chunks = r.chunks;
    nextId = r.nextId;
    assert.ok(chunks.length <= V24_CHUNK_RAW, `chunks exceeded cap: ${chunks.length}`);
  }
  assert.equal(chunks.length, V24_CHUNK_RAW);
});

test("chunk promotion ignores cells inside V24_CHUNK_TRIGGER", () => {
  const r = promoteChunk([], 1, 0, 0);
  assert.equal(r.promoted, null);
  assert.deepEqual(r.chunks, []);
  assert.equal(r.nextId, 1);
});

test("chunk promotion skips an already-occupied grid cell", () => {
  const first = promoteChunk([], 1, 8 * 120, 0);
  assert.ok(first.promoted);
  const second = promoteChunk(first.chunks, first.nextId, 8 * 120, 0);
  assert.equal(second.promoted, null);
  assert.equal(second.chunks.length, 1);
});

test("tail stays bounded at V24_TAIL_MAX and samples every Nth call", () => {
  let tail = [];
  for (let i = 0; i < V24_TAIL_MAX * 4; i += 1) {
    tail = pushTail(tail, { x: i, y: 0, z: 0 }, i);
    assert.ok(tailIsBounded(tail), `tail exceeded bound: ${tail.length}`);
  }
  assert.equal(tail.length, V24_TAIL_MAX);
});

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

test("rewind steps backwards through bounded history and stops at 0", () => {
  const history = [0, 10, 20, 30, 40];
  let idx = history.length - 1;
  let travel = history[idx];
  for (let i = 0; i < 10; i += 1) {
    const r = rewindStep(history, idx);
    idx = r.index;
    travel = r.travel;
  }
  assert.equal(travel, 0);
  assert.equal(idx, 0);
});

test("frontmostHit selects camera-nearest chunk", () => {
  const chunks = [
    { id: 1, gx: 0, gz: 0, x: 0, z: 0, born: 0 },
    { id: 2, gx: 10, gz: 0, x: 60, z: 0, born: 1 },
    { id: 3, gx: 1, gz: 0, x: 6, z: 0, born: 2 },
  ];
  const hit = frontmostHit(chunks, 5, 0);
  assert.equal(hit?.id, 3);
  assert.equal(frontmostHit([], 0, 0), null);
});

test("v24StateSnapshot clamps travel and exposes q", () => {
  const snap = v24StateSnapshot({ pos: [1, 1.5, 2], travel: 99999, raw: 89, chunks: 6, totalSamples: 761 });
  assert.equal(snap.travel, 7200);
  assert.equal(snap.q, 7200 + 0.58);
  assert.equal(snap.rawActive, 89);
  assert.equal(snap.staticChunks, 6);
});

test("assignable WORKS ledger never fabricates an href for HOLD targets", () => {
  assert.ok(worksLedgerHasNoFabricatedHref(LINEAGE_67_V24_WORKS_ASSIGNABLE));
  const holds = LINEAGE_67_V24_WORKS_ASSIGNABLE.filter((t) => t.status === "HOLD");
  for (const h of holds) assert.equal(h.href, null);
  // known enabled routes are real, explicit paths
  const byId = Object.fromEntries(LINEAGE_67_V24_WORKS_ASSIGNABLE.map((t) => [t.id, t]));
  assert.equal(byId["66"].href, "/v4/journey?v12=1");
  assert.equal(byId["64"].href, "/design-lab/lineages/64/v1-2-1");
  assert.equal(byId["61"].href, "/design-lab/lineages/61/61-v1-9");
});

test("V2.4.2 owner WORKS set never fabricates an href", () => {
  assert.ok(worksLedgerHasNoFabricatedHref(LINEAGE_67_V24_WORKS_V242_OWNER_SET));
  // 61 removed, 60 removed in V2.4.2 owner set
  const ids = LINEAGE_67_V24_WORKS_V242_OWNER_SET.map((t) => t.id);
  assert.ok(!ids.includes("61"));
  assert.ok(!ids.includes("60"));
  // Track 13 is HOLD (source resurrection HOLD per handoff §23) and must not navigate
  const t13 = LINEAGE_67_V24_WORKS_V242_OWNER_SET.find((t) => t.id === "13");
  assert.equal(t13?.status, "HOLD");
  assert.equal(t13?.href, null);
});
