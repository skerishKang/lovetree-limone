import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const TARGETS = [
  {
    source: "56",
    path: "app/trees/[id]/relationships/page.tsx",
    forbidden: [
      "SOURCE 56",
      "CANONICAL RELATIONSHIP VIEW",
      "Moment = canonical",
      "Connection = parentId + connectionReason",
      "VIEW_DERIVED",
      "new DB / API / schema = none",
    ],
  },
  {
    source: "60",
    path: "app/trees/[id]/explore/page.tsx",
    forbidden: [
      "SOURCE 60",
      "CANONICAL DEEP EXPLORE",
      "Moment / parent relation = canonical",
      "Cluster / Bridge = VIEW_DERIVED",
      "Canvas 2D software projection",
      "new DB / API / schema = none",
      "VIEW-DERIVED BRIDGE",
    ],
  },
  {
    source: "64",
    path: "app/trees/[id]/portal/page.tsx",
    forbidden: [
      "SOURCE 64",
      "Tree already resolved",
      "Moment = canonical",
      "orbit = VIEW_DERIVED",
      "V4EntryResolver untouched",
    ],
  },
];

test("canonical Five-Source views use product-facing copy while preserving QA identity markers", async () => {
  for (const target of TARGETS) {
    const source = await read(target.path);
    assert.match(source, new RegExp(`data-mvp-source=\\"${target.source}\\"`));
    for (const phrase of target.forbidden) {
      assert.equal(source.includes(phrase), false, `${target.path} leaked internal copy: ${phrase}`);
    }
  }
});

test("relationship, explore and portal keep their structural evidence hooks", async () => {
  const relationships = await read("app/trees/[id]/relationships/page.tsx");
  const explore = await read("app/trees/[id]/explore/page.tsx");
  const portal = await read("app/trees/[id]/portal/page.tsx");

  assert.match(relationships, /data-testid=\"source56-canonical-network\"/);
  assert.match(explore, /<canvas/);
  assert.match(explore, /aria-label=\"3D Moment Cluster Explorer/);
  assert.match(portal, /data-rendering=\"css3d-dom\"/);
  assert.match(portal, /aria-modal=\"true\"/);
});
