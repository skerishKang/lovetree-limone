import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { v3MotionArchiveMemories } from "../app/components/v3/fixtures/v3-fixtures.ts";
import { parseYouTubeId } from "../app/components/v3/v3-archive-state.ts";

const root = new URL("../", import.meta.url);

async function readApp(path) {
  return readFile(new URL(`app/${path}`, root), "utf8");
}

// 1. the shared normalized array is one exported fixture consumed by every mode
test("archive views consume one shared normalized memory array", async () => {
  const explorer = await readApp("components/v3/V3ArchiveExplorer.tsx");
  const fixtureUse = explorer.match(/v3MotionArchiveMemories/g) ?? [];
  assert.ok(fixtureUse.length >= 1, "explorer must import the single motion archive array");
  assert.doesNotMatch(explorer, /v3MemoriesByTree\(/, "explorer must not re-fetch by tree");
  for (const view of ["V3AlbumStage", "V3ShelfView", "V3AlbumFolding"]) {
    assert.match(
      explorer,
      new RegExp(`<${view}[\\s\\S]*?memories=`),
      `${view} must receive memories as a prop`,
    );
  }
});

// 2. selected state is a Moment ID, never an array index
test("selected state travels as a Moment ID across all views", async () => {
  for (const file of [
    "components/v3/V3ArchiveExplorer.tsx",
    "components/v3/V3AlbumStage.tsx",
    "components/v3/V3AlbumFolding.tsx",
    "components/v3/V3AlbumAccordion.tsx",
    "components/v3/V3ShelfView.tsx",
  ]) {
    const source = await readApp(file);
    assert.match(source, /selectedMomentId/, `${file} must use selectedMomentId`);
  }
  const explorer = await readApp("components/v3/V3ArchiveExplorer.tsx");
  assert.doesNotMatch(
    explorer,
    /momentId=\{selectedIndex/,
    "explorer must not store selected state as an index",
  );
});

// 3. accordion consumes shared props instead of querying fixtures itself
test("accordion receives shared data and never queries fixtures directly", async () => {
  const accordion = await readApp("components/v3/V3AlbumAccordion.tsx");
  assert.match(accordion, /memories: V3PreviewMemory\[\]/, "accordion takes memories as a prop");
  assert.doesNotMatch(accordion, /v3MemoriesByTree/, "accordion must not call fixture lookup");
  assert.doesNotMatch(accordion, /v3-fixtures/, "accordion must not import the fixture module");
  assert.doesNotMatch(accordion, /treeIds\[0\]\s*\)/, "accordion must not fetch the first tree only");
});

// 4. only the active heavy view is rendered; hidden views are not kept in the DOM
test("only the active heavy view renders at a time", async () => {
  const explorer = await readApp("components/v3/V3ArchiveExplorer.tsx");
  assert.match(explorer, /state\.view === "stage" &&\s*\(\s*<V3AlbumStage/);
  assert.match(explorer, /state\.view === "shelf" &&\s*\(\s*<V3ShelfView/);
  assert.match(explorer, /state\.view === "folding" &&\s*\(\s*<V3AlbumFolding/);
  assert.doesNotMatch(
    explorer,
    /className=\{.*hidden.*\}[\s\S]*<V3AlbumStage/,
    "views must not be hidden via CSS while mounted",
  );
});

// 5. the motion archive fixture uses unique, non-placeholder video IDs
test("motion archive fixture uses unique non-placeholder video IDs", () => {
  const ids = v3MotionArchiveMemories.map((memory) => parseYouTubeId(memory.sourceUrl ?? ""));
  const present = ids.filter(Boolean);
  assert.ok(present.length >= 9, "must have many embeddable moments");
  assert.equal(
    new Set(present).size,
    present.length,
    "motion archive video IDs must not be duplicated",
  );
  for (const id of ["dQw4w9WgXcQ", "9bZkp7q19f0"]) {
    assert.ok(!present.includes(id), `placeholder video id ${id} must not be used`);
  }
});

// 6. every view receives the same shared array instance identity
test("explorer derives every view's data from the same memories variable", async () => {
  const explorer = await readApp("components/v3/V3ArchiveExplorer.tsx");
  assert.match(explorer, /const memories = useMemo/, "explorer holds one memories variable");
  const stageRefs = explorer.match(/memories=\{memories\}/g) ?? [];
  const viewRefs = explorer.match(/memories=\{viewMemories\}/g) ?? [];
  assert.ok(
    stageRefs.length + viewRefs.length >= 3,
    "stage/shelf/folding must all receive shared data props",
  );
});
