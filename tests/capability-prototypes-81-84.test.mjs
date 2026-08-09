import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ARCHIVE_ITEMS,
  CINEMATIC_SCENES,
  DEFAULT_ARCHIVE_STATE,
  DEFAULT_ORBIT_CAMERA,
  MILESTONE_UNITS,
  MOMENT_HISTORY,
  ORBIT_CONNECTIONS,
  ORBIT_MOMENTS,
  RELATIONSHIP_EDGES,
  RELATIONSHIP_NODES,
  fragmentLayout,
  historyForMoment,
  milestoneProgress,
  parseMilestoneUnit,
  projectOrbitNode,
  serializeMilestoneUnit,
  transitionArchiveState,
  updateOrbitCamera,
} from "../lib/capability-prototypes-core.ts";

const read = (relative) => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

test("#81 orbit prototype keeps nodes, routes and camera interaction deterministic", () => {
  assert.equal(ORBIT_MOMENTS.length, 6);
  assert.equal(ORBIT_CONNECTIONS.length, 5);
  const nodeIds = new Set(ORBIT_MOMENTS.map((node) => node.id));
  for (const route of ORBIT_CONNECTIONS) {
    assert.ok(nodeIds.has(route.from));
    assert.ok(nodeIds.has(route.to));
  }

  const moved = updateOrbitCamera(DEFAULT_ORBIT_CAMERA, { deltaX: 100, deltaY: 900, wheel: 10000 });
  assert.equal(moved.yaw, 22);
  assert.equal(moved.pitch, 32);
  assert.equal(moved.distance, 1.45);
  const desktop = projectOrbitNode(ORBIT_MOMENTS[0], moved, "desktop");
  const mobile = projectOrbitNode(ORBIT_MOMENTS[0], moved, "mobile");
  assert.notEqual(desktop.x, mobile.x);
  assert.ok(desktop.opacity > 0 && desktop.opacity <= 1);
});

test("#82 convergence moves fragments from scattered positions to one readable axis", () => {
  assert.deepEqual(CINEMATIC_SCENES.map((scene) => scene.id), ["fragments", "gather", "axis", "tree"]);
  const scattered = fragmentLayout("fragments");
  const gathered = fragmentLayout("gather");
  assert.equal(scattered.length, gathered.length);
  assert.ok(scattered.some((item, index) => item.position.x !== gathered[index].position.x));
  assert.ok(gathered.every((item) => item.position.y === 49));
});

test("#82 relationship map references valid typed nodes and version history preserves the original", () => {
  const ids = new Set(RELATIONSHIP_NODES.map((node) => node.id));
  for (const edge of RELATIONSHIP_EDGES) {
    assert.ok(ids.has(edge.from));
    assert.ok(ids.has(edge.to));
  }
  const history = historyForMoment("moment-return");
  assert.equal(history.length, 3);
  assert.equal(history[0].kind, "original");
  assert.deepEqual(history.map((entry) => entry.version), [1, 2, 3]);
  assert.equal(MOMENT_HISTORY[0].text, "역 앞에서 다시 만났다.");
});

test("#83 archive state follows select → open → read → return without losing selection", () => {
  const target = ARCHIVE_ITEMS[2].id;
  let state = transitionArchiveState(DEFAULT_ARCHIVE_STATE, { type: "select", id: target });
  assert.equal(state.phase, "focused");
  assert.equal(state.selectedId, target);
  state = transitionArchiveState(state, { type: "open" });
  assert.equal(state.phase, "open");
  state = transitionArchiveState(state, { type: "read" });
  assert.equal(state.phase, "reading");
  state = transitionArchiveState(state, { type: "page", delta: 99 });
  assert.equal(state.page, 4);
  state = transitionArchiveState(state, { type: "return" });
  assert.equal(state.phase, "returning");
  state = transitionArchiveState(state, { type: "finish-return" });
  assert.equal(state.phase, "shelf");
  assert.equal(state.selectedId, target);
});

test("#84 milestone index exposes completion and rejects pending deep links", () => {
  assert.equal(MILESTONE_UNITS.length, 12);
  assert.equal(MILESTONE_UNITS.filter((unit) => unit.status === "complete").length, 7);
  assert.equal(MILESTONE_UNITS.filter((unit) => unit.status === "current").length, 1);
  assert.equal(MILESTONE_UNITS.filter((unit) => unit.status === "pending").length, 4);
  assert.deepEqual(milestoneProgress(), { completed: 7, available: 8, total: 12, percent: 58 });
  assert.equal(parseMilestoneUnit("?unit=season-03").id, "season-03");
  assert.equal(parseMilestoneUnit("?unit=season-12").id, "season-08");
  assert.equal(parseMilestoneUnit("?unit=unknown").id, "season-08");
  assert.equal(serializeMilestoneUnit("season-05"), "unit=season-05");
});

test("prototype routes pin evidence provenance and stay internal-only", async () => {
  const pages = await Promise.all([
    read("app/design-lab/capabilities/spatial-orbit/page.tsx"),
    read("app/design-lab/capabilities/cinematic-convergence/page.tsx"),
    read("app/design-lab/capabilities/relationship-history/page.tsx"),
    read("app/design-lab/capabilities/spatial-archive/page.tsx"),
    read("app/design-lab/capabilities/milestone-index/page.tsx"),
  ]);
  for (const page of pages) {
    assert.match(page, /INTERNAL PROTOTYPE/);
    assert.doesNotMatch(page, /fetch\(/);
    assert.doesNotMatch(page, /firebase/i);
    assert.doesNotMatch(page, /DATABASE_URL/);
  }
  assert.match(pages[0], /ISSUE #81/);
  assert.match(pages[0], /Lineage 52 V2\/V3/);
  assert.match(pages[1], /1WXvu841JgJevYFXTi04YRVxIcCLmD49D/);
  assert.match(pages[2], /1naQ9JnAclVUFbuTNzV3-W2ajK7Rr8Z8z/);
  assert.match(pages[3], /1lvs2HT-IS6kNo_B0SZvdpX2pzoJLHARn/);
  assert.match(pages[3], /1mJctk2-zSmeKcFIs6plQbs2h4P76eKZi/);
  assert.match(pages[4], /1ux7If502gyrfMi4nsa_Y3FFYBzfydjvp/);
});

test("shared prototype CSS provides mobile and reduced-motion contracts", async () => {
  const css = await read("app/styles/capability-prototypes-core.css");
  assert.match(css, /@media \(max-width:620px\)/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css, /transition-duration:\.001ms!important/);
  assert.match(css, /focus-visible/);
});
