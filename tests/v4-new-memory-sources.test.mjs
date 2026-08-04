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

const SOURCE_FILES = [
  "lovetree-memory-pulse-dashboard-v1.html",
  "lovetree-memory-scene-recipe-library-v1.html",
  "lovetree-moment-polish-lab-v1.html",
  "lovetree-memory-window-composer-v2.html",
];

const ROUTES = [
  "app/v4/memory/pulse/page.tsx",
  "app/v4/memory/recipes/page.tsx",
  "app/v4/memory/polish-lab/page.tsx",
  "app/v4/memory/window-composer/page.tsx",
];

const COMPONENTS = [
  "app/components/v4/V4MemoryPulse.tsx",
  "app/components/v4/V4SceneRecipeLibrary.tsx",
  "app/components/v4/V4MomentPolishLab.tsx",
  "app/components/v4/V4MemoryWindowComposer.tsx",
];

const CSS_FILES = [
  "app/styles/v4/memory-pulse.css",
  "app/styles/v4/scene-recipe-library.css",
  "app/styles/v4/moment-polish-lab.css",
  "app/styles/v4/memory-window-composer.css",
];

test("new source HTML files exist in the sample folder", async () => {
  for (const source of SOURCE_FILES) {
    assert.ok(await exists(`[샘플]/${source}`), `[샘플]/${source} must exist`);
  }
});

test("four new memory route pages exist", async () => {
  for (const path of ROUTES) {
    assert.ok(await exists(path), `${path} must exist`);
  }
});

test("four new memory components exist", async () => {
  for (const path of COMPONENTS) {
    assert.ok(await exists(path), `${path} must exist`);
  }
});

test("four new memory CSS files exist", async () => {
  for (const path of CSS_FILES) {
    assert.ok(await exists(path), `${path} must exist`);
  }
});

test("each route imports its own component and CSS", async () => {
  const pairs = [
    ["app/v4/memory/pulse/page.tsx", "V4MemoryPulse", "memory-pulse.css"],
    ["app/v4/memory/recipes/page.tsx", "V4SceneRecipeLibrary", "scene-recipe-library.css"],
    ["app/v4/memory/polish-lab/page.tsx", "V4MomentPolishLab", "moment-polish-lab.css"],
    ["app/v4/memory/window-composer/page.tsx", "V4MemoryWindowComposer", "memory-window-composer.css"],
  ];
  for (const [route, component, css] of pairs) {
    const source = await read(route);
    assert.match(source, new RegExp(component), `${route} must import ${component}`);
    assert.match(source, new RegExp(css), `${route} must import ${css}`);
  }
});

test("each component names its exact source HTML", async () => {
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

test("manifest contains all 33 sources including 4 new memory sources", async () => {
  const manifest = await read("app/components/v4/v4-source-manifest.ts");
  const sourceFileEntries = manifest.match(/sourceFile:\s*"/g) ?? [];
  assert.equal(sourceFileEntries.length, 33, "manifest must contain exactly 33 source entries");
  for (const source of SOURCE_FILES) {
    assert.match(manifest, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${source} must be in manifest`);
  }
});

test("implemented source IDs contain all 4 new memory sources", async () => {
  const implemented = await read("app/components/v4/v4-implemented-sources.ts");
  const ids = implemented.match(/^  "[^"]+",$/gm) ?? [];
  assert.equal(ids.length, 33, "implemented source ID set must contain 33 entries");
  assert.match(implemented, /memory-pulse-dashboard-v1/);
  assert.match(implemented, /memory-scene-recipe-library-v1/);
  assert.match(implemented, /moment-polish-lab-v1/);
  assert.match(implemented, /memory-window-composer-v2/);
});

test("registry requires 33 sources", async () => {
  const registry = await read("app/components/v4/v4-source-registry.ts");
  assert.match(registry, /V4_SOURCE_COUNT !== 33/);
});

test("journey dock includes all 4 new memory routes", async () => {
  const dock = await read("app/components/v4/V4JourneyDock.tsx");
  assert.match(dock, /\/v4\/memory\/pulse/);
  assert.match(dock, /\/v4\/memory\/recipes/);
  assert.match(dock, /\/v4\/memory\/polish-lab/);
  assert.match(dock, /\/v4\/memory\/window-composer/);
  assert.match(dock, /33 designs/);
});

test("new components do not use iframe delivery or V3 imports", async () => {
  for (const path of COMPONENTS) {
    const source = await read(path);
    assert.doesNotMatch(source, /components\/v3|styles\/v3|V3[A-Z]/, `${path} must not depend on V3`);
    assert.doesNotMatch(source, /srcdoc=|<iframe[^>]*src=["'](?!https:\/\/www\.youtube)/, `${path} must not use iframe delivery`);
  }
});
