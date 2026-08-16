import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const fixes = fs.readFileSync(path.join(ROOT, "app/styles/lineage-57-living-character-world-fixes.css"), "utf8");

test("Lineage57 Lubt keeps one wander animation identity and pauses it while dragging", () => {
  assert.match(fixes, /\.lcw-lubt\{animation:lcwLubtWander 16s ease-in-out infinite\}/);
  assert.match(fixes, /\.lcw-lubt\.dragging\{animation-play-state:paused!important;scale:1\.06\}/);
  assert.doesNotMatch(fixes, /\.lcw-lubt\.dragging\{animation:none!important\}/);
});

test("Lineage57 mobile swaps only the wander name and reduced motion still removes animation", () => {
  assert.match(fixes, /@media\(max-width:720px\)[\s\S]*\.lcw-lubt\{animation-name:lcwLubtWanderMobile\}/);
  assert.match(fixes, /@media\(prefers-reduced-motion:reduce\)\{\.lcw-lubt\{animation:none!important\}/);
});
