import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const sourcePath = "reference/source-tracks-snapshot/26_메모리필름스튜디오/01_메모리필름스튜디오_v1.html";
const componentPath = "app/design-lab/source-tracks/26/v1/donor/Track26MemoryFilmStudioDonor.tsx";
const manifestPath = "design-intake/source-track-26-memory-film-studio-v1-donor.json";

const source = readFileSync(sourcePath);
const html = source.toString("utf8");
const component = readFileSync(componentPath, "utf8");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

test("Track26 source fingerprint remains pinned", () => {
  assert.equal(source.byteLength, 48201);
  assert.equal(createHash("sha256").update(source).digest("hex"), "52bf3308053b1c805b963e775f41085caa7cdfdf123df0a7009a401a80e293d6");
  assert.equal(manifest.source_authority.git_blob, "04a729148fdd4f29d4192aab6211e89dea8614b2");
});

test("source is a client-side editor prototype, not durable canonical edit authority", () => {
  assert.match(html, /localStorage\.setItem\(['"]lovetree-memory-film-studio-v1/);
  assert.match(html, /MediaRecorder/);
  assert.match(html, /tree-felix/);
  assert.equal(manifest.source_character.canonical_persistence, false);
  assert.equal(manifest.product_disposition, "USE_AS_VISUAL_FUNCTION_DONOR");
});

test("native proof consumes canonical moments but adds no write or fake save", () => {
  assert.match(component, /useTreeMoments\(treeId\)/);
  assert.match(component, /albumMoments/);
  assert.doesNotMatch(component, /localStorage|MediaRecorder|method:\s*["'](?:POST|PUT|PATCH|DELETE)/);
  assert.match(component, /NO FAKE SAVE/);
  assert.equal(manifest.native_proof.durable_write_added, false);
});

test("Track26 film assembly remains distinct from Track24 workflow", () => {
  for (const marker of ["STORYBOARD", "PREVIEW MONITOR", "SCENE INSPECTOR", "DURATION", "CAMERA", "TIMELINE"]) assert.match(component, new RegExp(marker));
  assert.doesNotMatch(component, /source-tracks\/24/);
});

test("touch keyboard mobile reduced-motion and media boundaries are explicit", () => {
  assert.match(component, /Shift\+←\/→/);
  assert.match(component, /Space/);
  assert.match(component, /원본 미디어 열기/);
  const css = readFileSync("app/design-lab/source-tracks/26/v1/donor/track26-memory-film-studio.module.css", "utf8");
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test("central ownership files are not part of Track26 proof authority", () => {
  assert.equal(manifest.native_proof.production_route_mutation, false);
  assert.equal(manifest.native_proof.canonical_data_mutation, false);
  assert.equal(manifest.editor_base, "useTreeMoments(treeId) + canonical AlbumMomentView");
});
