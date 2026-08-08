import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

async function exists(path) {
  try {
    await stat(new URL(path, root));
    return true;
  } catch {
    return false;
  }
}

const SOURCE_ROUTE_FILES = [
  "app/v4/page.tsx",
  "app/v4/journey/page.tsx",
  "app/v4/trees/demo/onboarding/emotion/page.tsx",
  "app/v4/trees/demo/onboarding/connect/page.tsx",
  "app/v4/trees/demo/page.tsx",
  "app/v4/trees/demo/rest/page.tsx",
  "app/v4/trees/demo/state/page.tsx",
  "app/v4/community/page.tsx",
  "app/v4/trees/demo/graph/page.tsx",
  "app/v4/trees/demo/graph/100-moments/page.tsx",
  "app/v4/trees/demo/map/page.tsx",
  "app/v4/trees/demo/nebula/page.tsx",
  "app/v4/trees/demo/timeline/page.tsx",
  "app/v4/subjects/page.tsx",
  "app/v4/subjects/demo/motion/page.tsx",
  "app/v4/subjects/demo/orbit/page.tsx",
  "app/v4/subjects/demo/accordion/page.tsx",
  "app/v4/subjects/demo/folding/page.tsx",
  "app/v4/trees/demo/celebrate/300/page.tsx",
  "app/v4/trees/demo/celebrate/aurora/page.tsx",
  "app/v4/trees/demo/celebrate/canopy/page.tsx",
  "app/v4/trees/demo/celebrate/bloom/page.tsx",
  "app/v4/trees/demo/growth/300-plus/page.tsx",
  "app/v4/trees/demo/seasons/page.tsx",
  "app/v4/subjects/bookshelf/v1/page.tsx",
  "app/v4/subjects/bookshelf/v2-1/page.tsx",
  "app/v4/subjects/bookshelf/v2-3d/page.tsx",
  "app/v4/subjects/bookshelf/v2a-2/page.tsx",
];

const EXTRA_INTEGRATION_ROUTES = [
  "app/v4/subjects/demo/page.tsx",
  "app/v4/community/trees/demo/page.tsx",
  "app/v4/layout.tsx",
];

const VISUAL_IMPLEMENTATION_FILES = [
  "app/components/v4/V4Landing.tsx",
  "app/components/v4/V4EmotionStep.tsx",
  "app/components/v4/V4ConnectStep.tsx",
  "app/components/v4/V4TreeWorkspace.tsx",
  "app/components/v4/V4RestFlow.tsx",
  "app/components/v4/V4TreeState.tsx",
  "app/components/v4/V4GraphExperiences.tsx",
  "app/components/v4/V4PersonAlbums.tsx",
  "app/components/v4/V4ArchiveExperiences.tsx",
  "app/components/v4/V4CommunityDiscovery.tsx",
  "app/components/v4/V4MilestoneExperiences.tsx",
  "app/components/v4/V4JourneyDock.tsx",
  "app/components/v4/V4FirstJourney.tsx",
  "app/components/v4/V4Moments100.tsx",
  "app/components/v4/V4BookShelfV1.tsx",
  "app/components/v4/V4BookShelfV2P1.tsx",
  "app/components/v4/V4BookShelfV2D3.tsx",
  "app/components/v4/V4BookShelfV2A2.tsx",
];

const SOURCE_ROUTES = [
  "/v4",
  "/v4/journey",
  "/v4/trees/demo/onboarding/emotion",
  "/v4/trees/demo/onboarding/connect",
  "/v4/trees/demo",
  "/v4/trees/demo/rest",
  "/v4/trees/demo/state",
  "/v4/community",
  "/v4/trees/demo/graph",
  "/v4/trees/demo/graph/100-moments",
  "/v4/trees/demo/map",
  "/v4/trees/demo/nebula",
  "/v4/trees/demo/timeline",
  "/v4/subjects",
  "/v4/subjects/demo/motion",
  "/v4/subjects/demo/orbit",
  "/v4/subjects/demo/accordion",
  "/v4/subjects/demo/folding",
  "/v4/trees/demo/celebrate/300",
  "/v4/trees/demo/celebrate/aurora",
  "/v4/trees/demo/celebrate/canopy",
  "/v4/trees/demo/celebrate/bloom",
  "/v4/trees/demo/growth/300-plus",
  "/v4/trees/demo/seasons",
  "/v4/subjects/bookshelf/v1",
  "/v4/subjects/bookshelf/v2-1",
  "/v4/subjects/bookshelf/v2-3d",
  "/v4/subjects/bookshelf/v2a-2",
];

test("all 28 unique source routes and integration aliases exist", async () => {
  assert.equal(SOURCE_ROUTE_FILES.length, 28);
  for (const path of [...SOURCE_ROUTE_FILES, ...EXTRA_INTEGRATION_ROUTES]) {
    assert.ok(await exists(path), `${path} must exist`);
  }
});

test("canonical V4 registry requires all 29 source designs implemented", async () => {
  const implemented = await read("app/components/v4/v4-implemented-sources.ts");
  const registry = await read("app/components/v4/v4-source-registry.ts");
  const ids = implemented.match(/^  "[^"]+",$/gm) ?? [];
  assert.equal(ids.length, 29, "implemented source ID set must contain all 29 source designs");
  assert.match(registry, /V4_SOURCE_COUNT !== 29/);
  assert.match(registry, /V4_IMPLEMENTED_SOURCE_IDS\.size !== V4_SOURCE_COUNT/);
  assert.match(registry, /V4_UNIMPLEMENTED_SOURCES/);
});

test("every source route is reachable from the persistent V4 journey dock", async () => {
  const dock = await read("app/components/v4/V4JourneyDock.tsx");
  for (const route of SOURCE_ROUTES) {
    assert.match(dock, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${route} must be present in the V4 journey dock`);
  }
  assert.match(await read("app/v4/layout.tsx"), /V4JourneyDock/);
});

test("V4 visual code remains isolated from V3 and does not use iframe delivery", async () => {
  for (const path of VISUAL_IMPLEMENTATION_FILES) {
    const source = await read(path);
    assert.doesNotMatch(source, /components\/v3|styles\/v3|V3[A-Z]/, `${path} must not depend on V3 visual code`);
    assert.doesNotMatch(source, /src=\{.*\.html|srcdoc=|<iframe[^>]*src=["'](?!https:\/\/www\.youtube)/, `${path} must not deliver source HTML or same-origin pages through iframes`);
  }
});

test("workspace preserves v5 and v6 interaction mechanics", async () => {
  const source = await read("app/components/v4/V4TreeWorkspace.tsx");
  for (const pattern of [
    /v4-workspace-grid/,
    /v4-diary-list/,
    /onPointerDown/,
    /onPointerMove/,
    /curvePath/,
    /removeSelected/,
    /setZoom/,
    /resetView/,
    /requestFullscreen/,
    /v4-fullscreen-drawer/,
    /renderComposer\("v4-side"\)/,
    /renderComposer\("v4-drawer"\)/,
  ]) assert.match(source, pattern);
});

test("lifecycle ports separate rest, state, visibility, issues and private notes", async () => {
  const rest = await read("app/components/v4/V4RestFlow.tsx");
  const state = await read("app/components/v4/V4TreeState.tsx");
  assert.match(rest, /active.*resting/s);
  assert.match(rest, /기록을 그대로 둔 채/);
  assert.match(rest, /returnNote/);
  assert.match(state, /TREE_STATES/);
  assert.match(state, /VISIBILITY/);
  assert.match(state, /ISSUES/);
  assert.match(state, /privateNote/);
});

test("four graph experiences remain structurally distinct", async () => {
  const source = await read("app/components/v4/V4GraphExperiences.tsx");
  assert.match(source, /export function V4FreeGraph/);
  assert.match(source, /onPointerDown/);
  assert.match(source, /v4-node-handle/);
  assert.match(source, /export function V4ObsidianMap/);
  assert.match(source, /organic.*radial.*timeline/s);
  assert.match(source, /export function V4LoveNebula/);
  assert.match(source, /100 \| 300 \| 1000/);
  assert.match(source, /export function V4JuyeonTimeline/);
  assert.match(source, /v4-date-strip/);
});

test("all four separately supplied archive designs are full React experiences", async () => {
  const source = await read("app/components/v4/V4ArchiveExperiences.tsx");
  assert.match(source, /export function V4MotionArchive/);
  assert.match(source, /wave.*orbit.*vinyl.*diagonal/s);
  assert.match(source, /is-extracting/);
  assert.match(source, /export function V4LiquidOrbitGallery/);
  assert.match(source, /onWheel/);
  assert.match(source, /ArrowLeft/);
  assert.match(source, /export function V4AccordionArchive/);
  assert.match(source, /v4-accordion-spread/);
  assert.match(source, /v4-accordion-viewer/);
  assert.match(source, /export function V4FoldingPersonArchive/);
  assert.match(source, /opening.*open/s);
  assert.match(source, /v4-burst-page/);
  assert.match(source, /setPlaying\(false\)/);
});

test("community preserves compare, large preview and read-only full-tree stages", async () => {
  const source = await read("app/components/v4/V4CommunityDiscovery.tsx");
  assert.match(source, /toggleCompare/);
  assert.match(source, /v4-community-preview/);
  assert.match(source, /\/v4\/community\/trees\/demo/);
  assert.match(source, /export function V4PublicTree/);
  assert.match(source, /읽기 전용 공개 트리/);
  assert.match(source, /setZoom/);
  assert.match(source, /setOffset/);
});

test("milestone ports preserve six different completion and continuation experiences", async () => {
  const source = await read("app/components/v4/V4MilestoneExperiences.tsx");
  assert.match(source, /export function V4Finale300/);
  assert.match(source, /300번째 심기/);
  assert.match(source, /v4-finale-modal/);
  assert.match(source, /export function V4AuroraHeart/);
  assert.match(source, /ENERGY/);
  assert.match(source, /입자 폭발/);
  assert.match(source, /export function V4RainbowCanopy/);
  assert.match(source, /CATEGORIES/);
  assert.match(source, /다시 자라기/);
  assert.match(source, /export function V4PurpleBloom/);
  assert.match(source, /v4-petal/);
  assert.match(source, /다시 개화/);
  assert.match(source, /export function V4Growth300Plus/);
  assert.match(source, /v4-plus-minimap/);
  assert.match(source, /500.*750.*1000/s);
  assert.match(source, /export function V4SeasonArchive/);
  assert.match(source, /대표 기억 연결/);
  assert.match(source, /기존 기록을 보존하고 다음 시즌 시작/);
});

test("V1, V2, V3 and backend protected paths are not imported by V4 pages", async () => {
  for (const path of SOURCE_ROUTE_FILES) {
    const source = await read(path);
    assert.doesNotMatch(source, /@\/app\/components\/v[123]\//i);
    assert.doesNotMatch(source, /@\/app\/styles\/v[123]\//i);
    assert.doesNotMatch(source, /@\/lib\/auth|@\/lib\/api|db\/|drizzle\/|server\/api\/|worker\//);
  }
});
