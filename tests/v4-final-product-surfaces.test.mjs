import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("final V4 Tree family exposes semantic navigation tiers while compatibility routes remain materialized", async () => {
  const switcher = await read("app/components/ViewSwitcher.tsx");

  for (const kind of ["tree", "board", "relationships", "explore"]) {
    assert.match(switcher, new RegExp(`kind: \\\"${kind}\\\"`));
  }
  assert.match(switcher, /const PRIMARY_VIEWS/);
  assert.match(switcher, /const PORTAL_VIEW/);
  assert.match(switcher, /const SECONDARY_VIEWS/);
  assert.match(switcher, /data-view-tier="primary"/);
  assert.match(switcher, /data-view-tier="return"/);
  assert.match(switcher, /data-view-tier="secondary"/);
  assert.match(switcher, /ownerOnly: true/);
  assert.match(switcher, /!view\.ownerOnly \|\| isOwner/);

  for (const kind of ["overview", "graph", "replay", "studio"]) {
    assert.match(await read(`app/trees/[id]/${kind}/page.tsx`), new RegExp(`mode=\\\"${kind}\\\"`));
  }
  assert.match(await read("app/trees/[id]/story/page.tsx"), /V4PublicStorySticky/);

  // Album / Graph / Replay are intentionally not primary navigation after the
  // Five-Source semantic consolidation, but their compatibility routes remain.
  for (const kind of ["album", "graph", "replay"]) {
    assert.match(switcher, new RegExp(`\\\"${kind}\\\"`));
    assert.ok(await read(`app/trees/[id]/${kind}/page.tsx`));
  }
});

test("Overview derives safe metrics and recent Moment rows open canonical detail", async () => {
  const source = await read("app/components/v4/product/V4FinalTreeSurface.tsx");
  const page = await read("app/trees/[id]/overview/page.tsx");
  assert.match(source, /function OverviewSurface/);
  assert.match(source, /emotionCounts\(moments\)/);
  assert.match(source, /connectedCount/);
  assert.match(source, /presentation metric/);
  assert.doesNotMatch(source, /method:\s*["'](?:POST|PUT|DELETE)["']/);
  assert.match(page, /\.v4-overview-moments article/);
  assert.match(page, /role", "link"/);
  assert.match(page, /\?moment=\$\{encodeURIComponent\(memory\.id\)\}/);
  assert.match(page, /event\.key !== "Enter" && event\.key !== " "/);
});

test("Public Story is a sticky scroll exhibition over privacy-filtered Community Moments", async () => {
  const route = await read("app/trees/[id]/story/page.tsx");
  const source = await read("app/components/v4/product/V4PublicStorySticky.tsx");
  assert.match(route, /V4PublicStorySticky/);
  assert.match(source, /\/api\/community\/memories\?treeId=/);
  assert.match(source, /treeData\.visibility !== "public"/);
  assert.match(source, /v4-story-scroll-space/);
  assert.match(source, /v4-story-sticky/);
  assert.match(source, /window\.scrollY - root\.offsetTop/);
  assert.match(source, /scrollToChapter/);
  assert.match(source, /ArrowDown/);
  assert.match(source, /ArrowUp/);
  assert.match(source, /Moment detail →/);
  assert.doesNotMatch(source, /\/api\/trees\/\$\{encodeURIComponent\(treeId\)\}\/memories/);
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
