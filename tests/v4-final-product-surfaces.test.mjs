import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("final V4 Tree family exposes Overview Story Graph Replay and owner-only Studio", async () => {
  const switcher = await read("app/components/ViewSwitcher.tsx");
  for (const kind of ["overview", "story", "graph", "replay", "studio"]) {
    assert.match(switcher, new RegExp(`kind: \\\"${kind}\\\"`));
    assert.match(await read(`app/trees/[id]/${kind}/page.tsx`), new RegExp(`mode=\\\"${kind}\\\"`));
  }
  assert.match(switcher, /ownerOnly: true/);
  assert.match(switcher, /!view\.ownerOnly \|\| isOwner/);
});

test("Overview derives presentation metrics from real Tree Moments without DB writes", async () => {
  const source = await read("app/components/v4/product/V4FinalTreeSurface.tsx");
  assert.match(source, /function OverviewSurface/);
  assert.match(source, /emotionCounts\(moments\)/);
  assert.match(source, /connectedCount/);
  assert.match(source, /presentation metric/);
  assert.doesNotMatch(source, /method:\s*["'](?:POST|PUT|DELETE)["']/);
});

test("Public Story reads only the privacy-filtered Community Moment endpoint", async () => {
  const source = await read("app/components/v4/product/V4FinalTreeSurface.tsx");
  assert.match(source, /function PublicStorySurface/);
  assert.match(source, /tree\.visibility !== "public"/);
  assert.match(source, /\/api\/community\/memories\?treeId=/);
  assert.doesNotMatch(source, /PublicStorySurface[\s\S]*?\/api\/trees\/\$\{[^}]+\}\/memories/);
});

test("one Graph product contains the adopted internal modes and derives edges from parentId", async () => {
  const source = await read("app/components/v4/product/V4FinalTreeSurface.tsx");
  for (const mode of ["Graph", "Constellation", "Topology", "Atlas", "Observatory", "Lore"]) assert.match(source, new RegExp(`"${mode}"`));
  assert.match(source, /parentId: memory\.parentId/);
  assert.match(source, /byId\.get\(node\.parentId\)/);
  assert.match(source, /onWheel/);
  assert.match(source, /onPointerDown/);
});

test("Replay combines Vinyl queue with tactile tear/revisit behavior", async () => {
  const source = await read("app/components/v4/product/V4FinalTreeSurface.tsx");
  assert.match(source, /v4-vinyl-disc/);
  assert.match(source, /v4-replay-queue/);
  assert.match(source, /DRAG \/ TEAR TO REVISIT/);
  assert.match(source, /tear > 90/);
  assert.match(source, /tear < -90/);
});

test("Studio is owner-only and restores real JSON PNG and WebM export fidelity", async () => {
  const source = await read("app/components/v4/product/V4FinalTreeSurface.tsx");
  assert.match(source, /if \(!isOwner\)/);
  assert.match(source, /canvas\.toBlob/);
  assert.match(source, /canvas\.captureStream\(30\)/);
  assert.match(source, /new MediaRecorder/);
  assert.match(source, /lovetree-poster\.png/);
  assert.match(source, /lovetree-memory-film\.webm/);
  assert.match(source, /lovetree-storyboard\.json/);
  assert.match(source, /lovetree-film-config\.json/);
  assert.match(source, /RECIPES/);
  assert.match(source, /v4-composition-handle/);
});

test("Global Discovery Home consumes live Browse data and retains the editorial source hierarchy", async () => {
  const page = await read("app/v4/community/page.tsx");
  const source = await read("app/components/v4/product/V4GlobalDiscoveryHome.tsx");
  assert.match(page, /V4GlobalDiscoveryHome/);
  assert.match(source, /\/api\/community\/trees\?view=summary/);
  assert.match(source, /\/api\/community\/memories\?treeId=/);
  for (const phrase of ["Every lasting obsession", "PUBLIC GARDEN", "CURATED PATHS", "HOW A LOVETREE GROWS", "DISCOVER BY FEELING", "FEATURED LOVETREE", "WHAT CHANGES"]) assert.match(source, new RegExp(phrase));
  assert.doesNotMatch(source, /localStorage/);
});

test("Cinematic route uses the validated v6 International implementation", async () => {
  const page = await read("app/v4/cinematic/page.tsx");
  const source = await read("app/components/v4/cinematic/V4CinematicV6International.tsx");
  assert.match(page, /V4CinematicV6International/);
  assert.match(source, /data-cinematic-root/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /pointer: fine/);
});
