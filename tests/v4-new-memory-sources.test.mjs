import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function exists(path) {
  try { await stat(new URL(path, root)); return true; } catch { return false; }
}

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

const LAB_SOURCE_FILES = [
  "lovetree-memory-pulse-dashboard-v1.html",
  "lovetree-memory-scene-recipe-library-v1.html",
  "lovetree-moment-polish-lab-v1.html",
  "lovetree-memory-window-composer-v2.html",
];

const LAB_ROUTES = [
  "app/v4/labs/memory/pulse/page.tsx",
  "app/v4/labs/memory/recipes/page.tsx",
  "app/v4/labs/memory/polish-lab/page.tsx",
  "app/v4/labs/memory/window-composer/page.tsx",
];

const LAB_COMPONENTS = [
  "app/components/v4/V4MemoryPulse.tsx",
  "app/components/v4/V4SceneRecipeLibrary.tsx",
  "app/components/v4/V4MomentPolishLab.tsx",
  "app/components/v4/V4MemoryWindowComposer.tsx",
];

const LAB_CSS_FILES = [
  "app/styles/v4/memory-pulse.css",
  "app/styles/v4/scene-recipe-library.css",
  "app/styles/v4/moment-polish-lab.css",
  "app/styles/v4/memory-window-composer.css",
];

test("lab source HTML files exist in the sample folder", async () => {
  for (const source of LAB_SOURCE_FILES) {
    assert.ok(await exists(`[샘플]/${source}`), `[샘플]/${source} must exist`);
  }
});

test("four lab route pages exist under /v4/labs/memory/", async () => {
  for (const path of LAB_ROUTES) {
    assert.ok(await exists(path), `${path} must exist`);
  }
});

test("four lab components exist", async () => {
  for (const path of LAB_COMPONENTS) {
    assert.ok(await exists(path), `${path} must exist`);
  }
});

test("four lab CSS files exist", async () => {
  for (const path of LAB_CSS_FILES) {
    assert.ok(await exists(path), `${path} must exist`);
  }
});

test("each lab route imports its own component and CSS", async () => {
  const pairs = [
    ["app/v4/labs/memory/pulse/page.tsx", "V4MemoryPulse", "memory-pulse.css"],
    ["app/v4/labs/memory/recipes/page.tsx", "V4SceneRecipeLibrary", "scene-recipe-library.css"],
    ["app/v4/labs/memory/polish-lab/page.tsx", "V4MomentPolishLab", "moment-polish-lab.css"],
    ["app/v4/labs/memory/window-composer/page.tsx", "V4MemoryWindowComposer", "memory-window-composer.css"],
  ];
  for (const [route, component, css] of pairs) {
    const source = await read(route);
    assert.match(source, new RegExp(component), `${route} must import ${component}`);
    assert.match(source, new RegExp(css), `${route} must import ${css}`);
  }
});

test("each lab component names its exact source HTML", async () => {
  const pairs = [
    ["V4MemoryPulse.tsx", "lovetree-memory-pulse-dashboard-v1.html"],
    ["V4SceneRecipeLibrary.tsx", "lovetree-memory-scene-recipe-library-v1.html"],
    ["V4MomentPolishLab.tsx", "lovetree-moment-polish-lab-v1.html"],
    ["V4MemoryWindowComposer.tsx", "lovetree-memory-window-composer-v2.html"],
  ];
  for (const [component, source] of pairs) {
    const code = await read(`app/components/v4/${component}`);
    assert.match(code, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${component} must name ${source}`);
  }
});

test("official manifest still contains exactly 29 sources (lab sources excluded)", async () => {
  const manifest = await read("app/components/v4/v4-source-manifest.ts");
  const sourceFileEntries = manifest.match(/sourceFile:\s*"/g) ?? [];
  assert.equal(sourceFileEntries.length, 29, "official manifest must contain exactly 29 source entries");
  for (const source of LAB_SOURCE_FILES) {
    assert.doesNotMatch(manifest, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `official manifest must NOT contain lab source ${source}`);
  }
});

test("official implemented source IDs still contain exactly 29 (lab sources excluded)", async () => {
  const implemented = await read("app/components/v4/v4-implemented-sources.ts");
  const ids = implemented.match(/^  "[^"]+",$/gm) ?? [];
  assert.equal(ids.length, 29, "official implemented source ID set must contain 29 entries");
  assert.doesNotMatch(implemented, /memory-pulse-dashboard-v1/);
  assert.doesNotMatch(implemented, /memory-scene-recipe-library-v1/);
  assert.doesNotMatch(implemented, /moment-polish-lab-v1/);
  assert.doesNotMatch(implemented, /memory-window-composer-v2/);
});

test("lab source registry exists with 4 lab sources", async () => {
  const labRegistry = await read("app/components/v4/v4-lab-sources.ts");
  assert.match(labRegistry, /V4_LAB_SOURCE_REGISTRY/);
  assert.match(labRegistry, /memory-pulse-dashboard-v1/);
  assert.match(labRegistry, /memory-scene-recipe-library-v1/);
  assert.match(labRegistry, /moment-polish-lab-v1/);
  assert.match(labRegistry, /memory-window-composer-v2/);
  assert.match(labRegistry, /V4_LAB_SOURCE_COUNT/);
  const routeEntries = labRegistry.match(/route:\s*"/g) ?? [];
  assert.equal(routeEntries.length, 4, "lab registry must contain 4 route entries");
});

test("lab routes use /v4/labs/memory/ prefix", async () => {
  const labRegistry = await read("app/components/v4/v4-lab-sources.ts");
  assert.match(labRegistry, /\/v4\/labs\/memory\/pulse/);
  assert.match(labRegistry, /\/v4\/labs\/memory\/recipes/);
  assert.match(labRegistry, /\/v4\/labs\/memory\/polish-lab/);
  assert.match(labRegistry, /\/v4\/labs\/memory\/window-composer/);
});

test("journey dock includes lab group with 4 lab routes", async () => {
  const dock = await read("app/components/v4/V4JourneyDock.tsx");
  assert.match(dock, /실험실/);
  assert.match(dock, /\/v4\/labs\/memory\/pulse/);
  assert.match(dock, /\/v4\/labs\/memory\/recipes/);
  assert.match(dock, /\/v4\/labs\/memory\/polish-lab/);
  assert.match(dock, /\/v4\/labs\/memory\/window-composer/);
  assert.match(dock, /29 official \+ 4 lab designs/);
});

test("lab components include lab banner", async () => {
  for (const path of LAB_COMPONENTS) {
    const source = await read(path);
    assert.match(source, /제품 미확정 실험안/, `${path} must include lab banner`);
  }
});

test("lab components do not use iframe delivery or V3 imports", async () => {
  for (const path of LAB_COMPONENTS) {
    const source = await read(path);
    assert.doesNotMatch(source, /components\/v3|styles\/v3|V3[A-Z]/, `${path} must not depend on V3`);
    assert.doesNotMatch(source, /srcdoc=|<iframe[^>]*src=["'](?!https:\/\/www\.youtube)/, `${path} must not use iframe delivery`);
  }
});
