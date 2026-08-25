import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  TRACK17_LIVING_MEMORY_TERRAIN_SOURCE,
  projectCanonicalLivingTerrain,
} from "../lib/source-track-17/living-memory-terrain.ts";

const ROOT = process.cwd();
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

const canonicalRows = [
  {
    id: "moment-a",
    treeId: "tree-476",
    title: "첫 순간",
    memo: "실제 API가 돌려주는 형태의 테스트 fixture",
    emotionTags: ["설렘"],
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "moment-b",
    treeId: "tree-476",
    parentId: "moment-a",
    connectionReason: "그 다음에도 다시 생각났기 때문에",
    title: "이어진 순간",
    createdAt: "2026-08-02T00:00:00.000Z",
  },
  {
    id: "moment-c",
    treeId: "tree-476",
    parentId: "missing-parent",
    connectionReason: "응답에 부모가 없는 연결",
    title: "부분 응답",
    createdAt: "2026-08-03T00:00:00.000Z",
  },
];

test("Track17 source authority is pinned to the Living Memory Terrain semantic family", () => {
  assert.equal(TRACK17_LIVING_MEMORY_TERRAIN_SOURCE.family, "Drive Track17 Living Memory Terrain");
  assert.equal(TRACK17_LIVING_MEMORY_TERRAIN_SOURCE.filename, "01_리빙메모리지형_현재채택_가로화면안전_v1-2.html");
  assert.equal(TRACK17_LIVING_MEMORY_TERRAIN_SOURCE.bytes, 1_953_464);
  assert.equal(TRACK17_LIVING_MEMORY_TERRAIN_SOURCE.sha256, "2110fabd6e7ad4362e65af8474f66e5b468fb342dc9c96a0ca78930b225e694e");
  assert.match(TRACK17_LIVING_MEMORY_TERRAIN_SOURCE.namespaceGuard, /LIVING_MEMORY_TERRAIN_NE_HISTORICAL_GITHUB_TRACK17_GLOBAL_SHELL/);
  assert.equal(TRACK17_LIVING_MEMORY_TERRAIN_SOURCE.disposition, "USE_AS_VISUAL_FUNCTION_DONOR");
});

test("projection preserves canonical IDs and exact stored WHY NEXT relation without inventing a missing parent", () => {
  const projection = projectCanonicalLivingTerrain(canonicalRows);
  assert.deepEqual(projection.nodes.map((node) => node.id), ["moment-a", "moment-b", "moment-c"]);
  assert.equal(projection.edges.length, 1);
  assert.deepEqual(projection.edges[0], {
    fromId: "moment-a",
    toId: "moment-b",
    reason: "그 다음에도 다시 생각났기 때문에",
  });
  assert.equal(projection.orphanConnectionCount, 1);
  assert.equal(projection.nodes[1].memory, canonicalRows[1]);
});

test("terrain coordinates are bounded presentation geometry and do not mutate canonical rows", () => {
  const before = JSON.stringify(canonicalRows);
  const projection = projectCanonicalLivingTerrain(canonicalRows);
  for (const node of projection.nodes) {
    assert.ok(node.x >= 10 && node.x <= 90);
    assert.ok(node.y >= 18 && node.y <= 82);
    assert.ok(Number.isInteger(node.depth));
  }
  assert.equal(JSON.stringify(canonicalRows), before);
});

test("cyclic parent input fails bounded rather than creating unbounded semantic depth", () => {
  const projection = projectCanonicalLivingTerrain([
    { id: "a", treeId: "tree", parentId: "b" },
    { id: "b", treeId: "tree", parentId: "a" },
  ]);
  assert.ok(projection.maxDepth <= 32);
  assert.equal(projection.edges.length, 2);
});

test("native route reads the existing canonical useTreeMoments spine and ships no source demo rows", () => {
  const page = read("app/trees/[id]/terrain/page.tsx");
  const component = read("app/trees/[id]/terrain/LivingMemoryTerrain.tsx");
  assert.match(page, /useTreeMoments\(treeId\)/);
  assert.match(page, /moments=\{moments\}/);
  assert.doesNotMatch(page, /M0[1-5]/);
  assert.doesNotMatch(component, /id:\s*["']M0[1-5]/);
  assert.doesNotMatch(component, /returns\s*:/);
  assert.doesNotMatch(component, /Season formation/i);
  assert.match(component, /selected\.connectionReason/);
  assert.match(component, /selected\.parentId/);
});

test("dedicated manifest rejects numeric Track17 aliasing and records product truth boundary", () => {
  const manifest = JSON.parse(read("design-intake/source-track-17-living-memory-terrain-mytree-donor.json"));
  assert.equal(manifest.disposition, "USE_AS_VISUAL_FUNCTION_DONOR");
  assert.equal(manifest.namespaceGuard.numericAliasAllowed, false);
  assert.equal(manifest.namespaceGuard.historicalGlobalShellAdoptedByThisManifest, false);
  assert.equal(manifest.canonicalRuntimeAuthority.hook, "useTreeMoments(treeId)");
  assert.equal(manifest.canonicalRuntimeAuthority.durableWriteAdded, false);
  assert.equal(manifest.truthBoundary.returnCountInference, false);
  assert.equal(manifest.truthBoundary.seasonEntityInference, false);
  assert.equal(manifest.releaseBoundary.centralLedgerTouched, false);
  assert.equal(manifest.releaseBoundary.pr191Touched, false);
});

test("protected central ledger files are not named by the Track17 implementation surface", () => {
  const owned = [
    "app/trees/[id]/terrain/page.tsx",
    "app/trees/[id]/terrain/LivingMemoryTerrain.tsx",
    "app/trees/[id]/terrain/living-memory-terrain.module.css",
    "lib/source-track-17/living-memory-terrain.ts",
    "design-intake/source-track-17-living-memory-terrain-mytree-donor.json",
    "tests/source-track-17-living-memory-terrain-contract.test.mjs",
    "qa/source-track-17-living-memory-terrain-browser-qa.mjs",
    ".github/workflows/source-track17-living-memory-terrain-browser-qa.yml",
  ];
  assert.equal(owned.includes("design-intake/master-design-coverage.json"), false);
  assert.equal(owned.includes("tests/master-design-coverage-contract.test.mjs"), false);
});
