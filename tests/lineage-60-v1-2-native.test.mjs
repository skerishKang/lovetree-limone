import assert from "node:assert/strict";
import test from "node:test";
import {
  TRACK60_MOMENTS,
  TRACK60_CLUSTER_SPECS,
  buildTrack60Moments,
  deriveBridges,
  getClusterOf,
} from "../lib/lineage-60/data.ts";
import { parseIntakeManifest } from "../lib/design-intake/manifest.ts";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const manifest = JSON.parse(
  readFileSync(path.join(repoRoot, "design-intake/manifests/track-60-3d-moment-cluster.json"), "utf8"),
);

test("Track60 synthetic fixture builds a forest of VIEW_DERIVED clusters", () => {
  assert.ok(TRACK60_MOMENTS.length > 20, "fixture has a meaningful moment count");
  const themes = new Set(TRACK60_MOMENTS.map((m) => m.theme));
  assert.equal(themes.size, 4, "four view-derived clusters");
  for (const m of TRACK60_MOMENTS) {
    if (m.parentId) {
      const parent = TRACK60_MOMENTS.find((p) => p.id === m.parentId);
      assert.ok(parent, `parent ${m.parentId} resolves for ${m.id}`);
    }
  }
});

test("Track60 cluster specs aggregate every moment exactly once", () => {
  const total = TRACK60_CLUSTER_SPECS.reduce((a, c) => a + c.memberIds.length, 0);
  assert.equal(total, TRACK60_MOMENTS.length, "every moment belongs to exactly one cluster");
  for (const c of TRACK60_CLUSTER_SPECS) {
    for (const id of c.memberIds) {
      assert.equal(getClusterOf(id, TRACK60_MOMENTS), c.key, "member maps to its cluster");
    }
  }
});

test("Track60 Bridge Moments are real Moments connecting two different clusters", () => {
  const bridges = deriveBridges(TRACK60_MOMENTS);
  assert.ok(bridges.length >= 1, "at least one bridge moment exists");
  const byId = new Map(TRACK60_MOMENTS.map((m) => [m.id, m]));
  for (const b of bridges) {
    assert.notEqual(b.previousCluster, b.nextCluster, "bridge spans two clusters");
    const moment = byId.get(b.momentId);
    const parent = byId.get(b.incomingParentId);
    assert.ok(moment && parent, "bridge moment and parent resolve");
    assert.equal(moment.theme, b.nextCluster, "bridge moment sits in next cluster");
    assert.equal(parent.theme, b.previousCluster, "parent sits in previous cluster");
  }
});

test("Track60 fixture is deterministic and supports data variance without a hardcoded 1000", () => {
  const a = buildTrack60Moments();
  const b = buildTrack60Moments();
  assert.deepEqual(
    a.map((m) => m.id),
    b.map((m) => m.id),
    "deterministic ids across builds",
  );
  assert.equal(a.length, b.length, "deterministic length");

  const small = buildTrack60Moments({ count: 20 });
  const large = buildTrack60Moments({ count: 220 });
  assert.ok(small.length < TRACK60_MOMENTS.length, "smaller count shrinks the set");
  assert.ok(large.length > TRACK60_MOMENTS.length, "larger count grows the set");
  assert.notEqual(small.length, 1000, "never hard-wires a 1000-node requirement");
});

test("Track60 long-copy variant exercises Korean/English overflow content", () => {
  const long = buildTrack60Moments({ longCopy: true });
  const hasLongKorean = long.some((m) => m.memo.length > 80);
  assert.ok(hasLongKorean, "long Korean memo present for overflow QA");
});

test("Track60 intake manifest keeps factory-internal consistency and backend-free scope", () => {
  const parsed = parseIntakeManifest(manifest);
  assert.equal(parsed.sourceTrackId, "Track60");
  assert.equal(parsed.designLineageId, "lt-60-3d-moment-cluster-explorer");
  assert.equal(parsed.route?.path, "/design-lab/lineages/60/v1-2", "route matches implemented native route");
  assert.equal(parsed.rendering, "canvas-3d-projection", "software-projected canvas 3D discriminant");
  assert.equal(parsed.backendScope, "BACKEND_FREE", "no Cluster/BridgeMoment DB entity");
});
