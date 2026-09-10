import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  TRACK14_SOURCE_BYTES,
  TRACK14_SOURCE_GIT_BLOB,
  TRACK14_SOURCE_SHA256,
  track14BuildProjection,
  track14Descendants,
  track14Phase,
} from "../lib/source-track-14/mindmap.ts";

const SOURCE_PATH = "reference/source-tracks-snapshot/14_자동전개마인드맵_템플릿컴포저/01_자동전개마인드맵_현재채택_템플릿컴포저_v2-4.html";

function gitBlobSha(bytes) {
  return createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${bytes.byteLength}\0`), bytes])).digest("hex");
}

const moments = [
  { id: "root", parentId: null, connectionReason: null, sortOrder: 0 },
  { id: "m1", parentId: "root", connectionReason: "첫 순간에서", sortOrder: 1 },
  { id: "e1", parentId: "m1", connectionReason: "처음 느낀 감정", sortOrder: 2 },
  { id: "m2", parentId: "m1", connectionReason: "더 궁금해져서", sortOrder: 3 },
  { id: "m3", parentId: "m1", connectionReason: "다시 돌아와서", sortOrder: 4 },
  { id: "e2", parentId: "m2", connectionReason: "감정이 깊어짐", sortOrder: 5 },
  { id: "m4", parentId: "m2", connectionReason: "다음 순간을 찾음", sortOrder: 6 },
  { id: "e3", parentId: "m3", connectionReason: "돌아온 뒤", sortOrder: 7 },
  { id: "n1", parentId: "m4", connectionReason: "남겨둔 말", sortOrder: 8 },
];

test("Track14 exact Drive/repository source fingerprint is pinned", async () => {
  const bytes = await readFile(SOURCE_PATH);
  assert.equal(bytes.byteLength, TRACK14_SOURCE_BYTES);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), TRACK14_SOURCE_SHA256);
  assert.equal(gitBlobSha(bytes), TRACK14_SOURCE_GIT_BLOB);
  assert.equal(TRACK14_SOURCE_SHA256, "c30d6e1ce861bffbeccbeaeab515a8d51fd4bf00704f7093f3b1aab505cc3d4c");
  const source = bytes.toString("utf8");
  assert.match(source, /VERSION: v2\.4/);
  assert.match(source, /SCREEN: template-composer/);
});

test("Track14 projection preserves canonical parentId and WHY NEXT truth across visual layouts", () => {
  const expectedEdges = moments.filter((moment) => moment.parentId).map((moment) => [moment.parentId, moment.id, moment.connectionReason]);
  for (const mode of ["branch", "orbit", "journey", "timeline"]) {
    for (const mobile of [false, true]) {
      const projection = track14BuildProjection(moments, mode, mobile);
      assert.deepEqual(projection.edges.map((edge) => [edge.from, edge.to, edge.label]), expectedEdges);
      assert.deepEqual(projection.nodes.map((node) => node.id), moments.map((moment) => moment.id));
      assert.deepEqual(moments.map((moment) => [moment.id, moment.parentId, moment.connectionReason]), [
        ["root", null, null], ["m1", "root", "첫 순간에서"], ["e1", "m1", "처음 느낀 감정"],
        ["m2", "m1", "더 궁금해져서"], ["m3", "m1", "다시 돌아와서"], ["e2", "m2", "감정이 깊어짐"],
        ["m4", "m2", "다음 순간을 찾음"], ["e3", "m3", "돌아온 뒤"], ["n1", "m4", "남겨둔 말"],
      ]);
    }
  }
});

test("Track14 never invents WHY NEXT text when canonical connectionReason is absent", () => {
  const projection = track14BuildProjection([
    { id: "root", parentId: null, connectionReason: null, sortOrder: 0 },
    { id: "child", parentId: "root", connectionReason: null, sortOrder: 1 },
  ], "branch", false);
  assert.equal(projection.edges.length, 1);
  assert.equal(projection.edges[0].from, "root");
  assert.equal(projection.edges[0].to, "child");
  assert.equal(projection.edges[0].label, "");
});

test("Track14 branch focus is a view-only descendant projection", () => {
  const projection = track14BuildProjection(moments, "branch", false);
  assert.deepEqual([...track14Descendants(projection.edges, "m2")], ["m2", "e2", "m4", "n1"]);
  assert.deepEqual([...track14Descendants(projection.edges, "m3")], ["m3", "e3"]);
  assert.equal(track14Phase(0), "SEED");
  assert.equal(track14Phase(1), "FORM COMPLETE");
});

test("Track14 native lens consumes canonical PATH state and adds no writable graph authority", async () => {
  const component = await readFile("app/trees/[id]/graph/mindmap/Track14MindmapDonor.tsx", "utf8");
  const manifest = JSON.parse(await readFile("design-intake/source-track-14-auto-expanding-mindmap-v2-4-donor.json", "utf8"));
  assert.match(component, /useTreeMoments\(treeId\)/);
  assert.match(component, /selectedMomentId/);
  assert.match(component, /selectMoment/);
  assert.equal(component.includes("apiFetch("), false);
  assert.equal(component.includes('method: "POST"'), false);
  assert.equal(component.includes('method: "PUT"'), false);
  assert.equal(component.includes('method: "DELETE"'), false);
  assert.equal(manifest.productDisposition, "USE_AS_VISUAL_FUNCTION_DONOR");
  assert.equal(manifest.productBoundary.newBackend, false);
  assert.equal(manifest.productBoundary.newPersistence, false);
  assert.equal(manifest.productBoundary.newDatabaseEntity, false);
  assert.equal(manifest.productBoundary.newApi, false);
  assert.equal(manifest.productBoundary.writesConnectionTruth, false);
  assert.equal(manifest.parallelSafety.sharedRegistryTouched, false);
  assert.equal(manifest.parallelSafety.sharedNavigationTouched, false);
  assert.equal(manifest.parallelSafety.pr191Touched, false);
});

test("Track14 native quality contract includes mobile, focus and reduced-motion treatment", async () => {
  const css = await readFile("app/trees/[id]/graph/mindmap/track14-mindmap.module.css", "utf8");
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /focus-visible/);
  assert.match(css, /touch-action:none/);
});