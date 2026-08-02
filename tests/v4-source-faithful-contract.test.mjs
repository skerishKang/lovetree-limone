import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function exists(path) {
  try {
    await stat(new URL(path, root));
    return true;
  } catch {
    return false;
  }
}

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

const SOURCE_FILES = [
  "lovetree-complete-manga-refinement(4).html",
  "lovetree-step2-emotion-refined(6).html",
  "lovetree-step3-connect-next-video(6).html",
  "lovetree-growing-tree-v5-draggable-notes(4).html",
  "lovetree-growing-tree-v6-fullscreen-add(4).html",
  "lovetree-rest-return-flow-v2-simple(3).html",
  "lovetree-tree-pause-issue-state-v1(2).html",
  "lovetree-community-discovery-v2(5).html",
  "lovetree-node-graph-prototype(6).html",
  "lovetree-obsidian-graph1(4).html",
  "lovetree-love-nebula(4).html",
  "lovetree-juyeon-timeline(4).html",
  "lovetree-person-albums(4).html",
  "lovetree-motion-archive-v5-video-click-autoplay(3).html",
  "lovetree-liquid-orbit-video-gallery(2).html",
  "lovetree-accordion-album-archive-v3-fixed(3).html",
  "lovetree-folding-person-archive(3).html",
  "lovetree-300-moments-finale(4).html",
  "lovetree-aurora-particle-heart(4).html",
  "lovetree-rainbow-memory-canopy(4).html",
  "lovetree-purple-bloom-graph(4).html",
  "lovetree-growing-tree-300-plus-v2-freegraph(1).html",
  "lovetree-growing-tree-season-archive-v3(1).html",
];

const IMPLEMENTED_PHASE_ONE_ROUTES = [
  "app/v4/page.tsx",
  "app/v4/trees/new/page.tsx",
  "app/v4/trees/demo/onboarding/emotion/page.tsx",
  "app/v4/trees/demo/onboarding/connect/page.tsx",
  "app/v4/trees/demo/page.tsx",
];

const V4_VISUAL_FILES = [
  "app/components/v4/V4Landing.tsx",
  "app/components/v4/V4EmotionStep.tsx",
  "app/components/v4/V4ConnectStep.tsx",
  "app/components/v4/V4PhaseBoundary.tsx",
  "app/styles/v4/onboarding.css",
];

test("V4 manifest covers every one of the 23 supplied UI HTML sources", async () => {
  const manifest = await read("app/components/v4/v4-source-manifest.ts");
  assert.equal(SOURCE_FILES.length, 23);
  for (const filename of SOURCE_FILES) {
    assert.match(manifest, new RegExp(filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${filename} must be present in the V4 source manifest`);
  }
  const sourceFileEntries = manifest.match(/sourceFile:/g) ?? [];
  assert.equal(sourceFileEntries.length, 23, "manifest must contain exactly 23 source entries");
});

test("all four separately supplied archive HTMLs remain first-class sources", async () => {
  const manifest = await read("app/components/v4/v4-source-manifest.ts");
  const mandatory = [
    "motion-archive",
    "liquid-orbit-video-gallery",
    "accordion-album-archive",
    "folding-person-archive",
  ];
  for (const sourceId of mandatory) {
    const start = manifest.indexOf(`id: \"${sourceId}\"`);
    assert.notEqual(start, -1, `${sourceId} must exist`);
    const next = manifest.indexOf("\n  {", start + 1);
    const block = manifest.slice(start, next === -1 ? undefined : next);
    assert.match(block, /separatelySupplied: true/, `${sourceId} must be marked separately supplied`);
    assert.match(block, /status: \"planned\"|status: \"implemented\"/, `${sourceId} must carry an explicit status`);
  }
  assert.equal((manifest.match(/separatelySupplied: true/g) ?? []).length, 4);
});

test("phase-one V4 routes and source-faithful components exist", async () => {
  for (const path of IMPLEMENTED_PHASE_ONE_ROUTES) {
    assert.ok(await exists(path), `${path} must exist`);
  }
  for (const path of V4_VISUAL_FILES) {
    assert.ok(await exists(path), `${path} must exist`);
  }
});

test("V4 visual implementation does not import V3 components or styles", async () => {
  for (const path of V4_VISUAL_FILES) {
    const source = await read(path);
    assert.doesNotMatch(source, /components\/v3|styles\/v3|V3[A-Z]/, `${path} must not depend on V3 visual code`);
  }
});

test("V4 phase-one implementation is a React port, not iframe delivery", async () => {
  for (const path of V4_VISUAL_FILES.filter((path) => path.endsWith(".tsx"))) {
    const source = await read(path);
    assert.doesNotMatch(source, /<iframe\b/i, `${path} must not use an iframe shortcut`);
  }
});

test("landing preserves modal, discovery form and live preview mechanics", async () => {
  const landing = await read("app/components/v4/V4Landing.tsx");
  assert.match(landing, /v4-modal-backdrop/);
  assert.match(landing, /v4-seed-modal/);
  assert.match(landing, /v4-discovery-note/);
  assert.match(landing, /v4-discovery-date/);
  assert.match(landing, /v4-seed-preview-card/);
  assert.match(landing, /Escape/);
  assert.match(landing, /lovetree-v4-discovery/);
  assert.match(landing, /\/v4\/trees\/demo\/onboarding\/emotion/);
});

test("emotion port preserves time, emotion, memo, visibility and success states", async () => {
  const emotion = await read("app/components/v4/V4EmotionStep.tsx");
  assert.match(emotion, /changeSeconds\(-5\)/);
  assert.match(emotion, /changeSeconds\(5\)/);
  assert.match(emotion, /EMOTIONS/);
  assert.match(emotion, /customEmotion/);
  assert.match(emotion, /maxLength=\{140\}/);
  assert.match(emotion, /publicMemo/);
  assert.match(emotion, /v4-success-card/);
  assert.match(emotion, /lovetree-v4-emotion/);
  assert.match(emotion, /\/v4\/trees\/demo\/onboarding\/connect/);
});

test("connection port preserves two-card board, branch and relation flow", async () => {
  const connect = await read("app/components/v4/V4ConnectStep.tsx");
  assert.match(connect, /v4-connection-board/);
  assert.match(connect, /v4-branch-svg/);
  assert.match(connect, /v4-moment-card is-first/);
  assert.match(connect, /v4-moment-card is-next/);
  assert.match(connect, /RELATIONS/);
  assert.match(connect, /lovetree-v4-connection/);
  assert.match(connect, /continueFromNext/);
  assert.match(connect, /\/v4\/trees\/demo/);
});

test("workspace boundary cannot be mistaken for completed source implementation", async () => {
  const boundary = await read("app/v4/trees/demo/page.tsx");
  const manifest = await read("app/components/v4/v4-source-manifest.ts");
  assert.match(boundary, /임시 상태/);
  for (const sourceId of ["growing-tree-v5-draggable-notes", "growing-tree-v6-fullscreen-add"]) {
    const start = manifest.indexOf(`id: \"${sourceId}\"`);
    const next = manifest.indexOf("\n  {", start + 1);
    const block = manifest.slice(start, next === -1 ? undefined : next);
    assert.match(block, /status: \"planned\"/, `${sourceId} must remain planned until the source design is actually ported`);
  }
});
